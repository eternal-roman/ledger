import { Money } from '../../core/money.js';
import { JournalEntry, createEntry, makeLine } from '../../core/journal.js';
import { Account } from '../../core/account.js';
import { Period, periods, presentValueOfAnnuity } from '../../time/index.js';

/**
 * Shared schedule model (M0 for IFRS 15/16 engine).
 * Immutable, hashable, citation-carrying, emits kernel-validated JournalEntry[].
 * All values exact Money. Every line cites governing para.
 */

export interface ScheduleLine {
  readonly period: Period;
  readonly opening: Money;
  readonly additions?: Money;   // interest / revenue recognized
  readonly reductions?: Money;  // payment / amortization
  readonly closing: Money;
  readonly citations: readonly string[];
}

export interface Schedule {
  readonly kind: 'LEASE_LIABILITY' | 'ROU_ASSET' | 'REVENUE' | 'CONTRACT_ASSET' | 'CONTRACT_LIABILITY';
  readonly currency: string;
  readonly lines: readonly ScheduleLine[];
  readonly inputsHash: string; // stable hash of driving inputs
  hash(): string;
  /** Emit suggested postings (caller maps to real accounts). Each passes validateEntry. */
  toEntries(baseId: string, debit: Account, credit: Account, descriptionPrefix?: string): JournalEntry[];
}

function stableHash(input: string): string {
  // lightweight deterministic (node:crypto already dep via ledger; keep simple here or reuse)
  // For M0 use JSON + length prefix sim; real uses ledger.audit but avoid cycle
  const { createHash } = require('node:crypto');
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

/** Basic effective-interest / amort schedule for fixed payments (M0 foundation). */
export function buildAmortizationSchedule(
  kind: Schedule['kind'],
  principal: Money,
  periodicPayment: Money,
  ratePerPeriod: string | number,
  numPeriods: number,
  startDate: string,
  freq: any = 'MONTHLY',
  citations: string[] = ['IFRS 16.36', 'IFRS 15.31']
): Schedule {
  if (!principal || principal.isZero()) throw new Error('principal required');
  if (numPeriods < 1) throw new Error('numPeriods >=1');
  const currency = principal.currency;
  if (periodicPayment.currency !== currency) throw new Error('currency mismatch');

  const rate = String(ratePerPeriod);
  const ps = periods(startDate, advanceMonths(startDate, numPeriods, freq), freq);
  if (ps.length === 0) throw new Error('no periods');

  const lines: ScheduleLine[] = [];
  let bal = principal;
  let inputSeed = `${principal.toHashable()}|${periodicPayment.toHashable()}|${rate}|${numPeriods}|${startDate}`;

  for (let i = 0; i < Math.min(numPeriods, ps.length); i++) {
    const p = ps[i];
    let interest = bal.mul(rate);
    // Round to currency scale to satisfy kernel SUB_SCALE validation
    const d = (interest as any).scale ?? 2;
    interest = Money.from(interest.toDecimal().toDecimalPlaces(d, 4).toString(), currency);
    const reduction = periodicPayment;
    const closing = bal.add(interest).sub(reduction);
    const line: ScheduleLine = {
      period: p,
      opening: bal,
      additions: interest,
      reductions: reduction,
      closing: closing.isZero() ? Money.zero(currency) : closing,
      citations: [...citations],
    };
    lines.push(line);
    bal = closing;
    inputSeed += `|${p.start}`;
  }

  const inputsHash = stableHash(inputSeed);

  return {
    kind,
    currency,
    lines: Object.freeze(lines) as readonly ScheduleLine[],
    inputsHash,
    hash() {
      return stableHash(this.inputsHash + '|' + this.lines.map(l => l.closing.toHashable()).join('|'));
    },
    toEntries(baseId, debitAcct, creditAcct, prefix = '') {
      return this.lines.map((ln, idx) => {
        // Example: for liability amort: debit interest-exp or ROU amort, credit cash or liab adjust.
        // Keep generic: produce a simple recognition entry per period (debit expense/interest, credit reduction)
        const amt = ln.additions ?? ln.reductions ?? Money.zero(currency);
        if (amt.isZero()) {
          // zero period stub not emitted
          return null as any;
        }
        const desc = `${prefix} ${kind} period ${ln.period.index} ${ln.period.start}`;
        const entry = createEntry(
          `${baseId}-p${idx}`,
          ln.period.start,
          [
            makeLine(debitAcct, amt, 'debit'),
            makeLine(creditAcct, amt, 'credit'),
          ],
          desc,
          ln.citations as string[]
        );
        return entry;
      }).filter(Boolean) as JournalEntry[];
    },
  };
}

function advanceMonths(d: string, n: number, freq: any): string {
  const step = typeof freq === 'object' ? freq.everyMonths : (freq === 'ANNUAL' ? 12 : freq === 'QUARTERLY' ? 3 : 1);
  const [y, m, day] = d.split('-').map(Number);
  let ny = y + Math.floor((m - 1 + n * step) / 12);
  let nm = ((m - 1 + n * step) % 12) + 1;
  const nd = Math.min(day, new Date(Date.UTC(ny, nm, 0)).getUTCDate());
  return `${ny.toString().padStart(4, '0')}-${nm.toString().padStart(2, '0')}-${nd.toString().padStart(2, '0')}`;
}

/** Convenience: PV using the annuity helper (M0). */
export { presentValueOfAnnuity as computePV };
