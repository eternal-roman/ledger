import { Account, AccountType } from '../core/account.js';
import { Ledger } from '../core/ledger.js';
import { Money } from '../core/money.js';
import { isISODate } from '../core/journal.js';

/**
 * Cash Flow Statement (direct method) derived exactly from the immutable ledger.
 *
 * The double-entry ledger already encodes every cash movement: for any balanced
 * entry, the net change in the cash accounts equals minus the net change in the
 * non-cash accounts. So we attribute each NON-cash leg's contribution to cash and
 * classify it by the counterparty account type:
 *
 *   Income / Expense  -> Operating
 *   Asset (non-cash)  -> Investing
 *   Liability / Equity-> Financing
 *
 * A leg's signed contribution to cash is (credit - debit): a credit to revenue is
 * cash in (+), a debit to an expense or an asset purchase is cash out (-). Summing
 * these per classification reconstructs the cash flow statement to the minor unit,
 * with no float and no parallel state.
 *
 * Per currency. Self-checking: opening + operating + investing + financing must
 * equal the independently-computed closing cash balance, or `reconciled` is false
 * (which can only happen on a corrupted ledger the kernel would already reject).
 *
 * Citations: accounting-cycle / period reporting (`gaap-period-cutoff-closing`).
 */

export type CashAccountPredicate = (account: Account) => boolean;

/**
 * Default convention: an account is "cash" if it is an Asset whose code starts
 * with `CASH` (the trading-layer convention `CASH:{VENUE}:{FIAT}`) or whose name
 * contains the word "cash". Pass an explicit predicate or code list to override.
 */
export function isCashByConvention(account: Account): boolean {
  if (account.type !== AccountType.Asset) return false;
  const code = account.code.toUpperCase();
  const name = account.name.toLowerCase();
  return code.startsWith('CASH') || /\bcash\b/.test(name);
}

export interface CashFlowSection {
  readonly currency: string;
  readonly operating: string;
  readonly investing: string;
  readonly financing: string;
  readonly netChange: string;
  readonly openingCash: string;
  readonly closingCash: string;
  /** opening + netChange === independently-computed closing (exact). */
  readonly reconciled: boolean;
}

export interface CashFlowOptions {
  /** Inclusive period start (YYYY-MM-DD). Omit to start from the beginning of the ledger. */
  readonly start?: string;
  /** Inclusive period end (YYYY-MM-DD). Omit to run through the latest entry. */
  readonly end?: string;
  /** Override which accounts count as cash. */
  readonly isCash?: CashAccountPredicate;
  /** Explicit cash account codes (alternative to a predicate). */
  readonly cashAccountCodes?: readonly string[];
}

interface Buckets {
  operating: Money;
  investing: Money;
  financing: Money;
  opening: Money;
  closingDirect: Money;
}

function classify(type: AccountType): 'operating' | 'investing' | 'financing' {
  switch (type) {
    case AccountType.Income:
    case AccountType.Expense:
      return 'operating';
    case AccountType.Asset:
      return 'investing';
    case AccountType.Liability:
    case AccountType.Equity:
      return 'financing';
  }
}

/**
 * Build a direct-method cash flow statement per currency over an optional period.
 * Returns one section per currency that has cash activity.
 */
export function cashFlowStatement(ledger: Ledger, opts: CashFlowOptions = {}): CashFlowSection[] {
  if (opts.start && !isISODate(opts.start)) throw new Error(`cashFlowStatement: invalid start "${opts.start}"`);
  if (opts.end && !isISODate(opts.end)) throw new Error(`cashFlowStatement: invalid end "${opts.end}"`);
  if (opts.start && opts.end && opts.start > opts.end) {
    throw new Error(`cashFlowStatement: start ${opts.start} is after end ${opts.end}`);
  }

  const codeSet = opts.cashAccountCodes ? new Set(opts.cashAccountCodes) : undefined;
  const isCash: CashAccountPredicate = codeSet
    ? (a) => codeSet.has(a.code)
    : (opts.isCash ?? isCashByConvention);

  const byCurrency = new Map<string, Buckets>();
  const bucket = (c: string): Buckets => {
    let b = byCurrency.get(c);
    if (!b) {
      b = {
        operating: Money.zero(c),
        investing: Money.zero(c),
        financing: Money.zero(c),
        opening: Money.zero(c),
        closingDirect: Money.zero(c),
      };
      byCurrency.set(c, b);
    }
    return b;
  };

  for (const entry of ledger.entries) {
    const date = entry.effectiveDate;
    const beforePeriod = opts.start ? date < opts.start : false;
    const afterPeriod = opts.end ? date > opts.end : false;
    const inPeriod = !beforePeriod && !afterPeriod;
    const onOrBeforeEnd = !afterPeriod;

    // Does this entry touch any cash account? If not, it has no cash effect.
    const hasCash = entry.lines.some((l) => isCash(l.account));
    if (!hasCash) continue;

    for (const line of entry.lines) {
      if (isCash(line.account)) continue; // cash side is the mirror of the non-cash side
      const c = line.amount.currency;
      const b = bucket(c);
      // Signed contribution to cash from this counterparty leg = credit - debit.
      const signed = line.side === 'credit' ? line.amount : line.amount.negate();

      if (beforePeriod) {
        b.opening = b.opening.add(signed);
      }
      if (onOrBeforeEnd) {
        b.closingDirect = b.closingDirect.add(signed);
      }
      if (inPeriod) {
        const klass = classify(line.account.type);
        b[klass] = b[klass].add(signed);
      }
    }
  }

  const sections: CashFlowSection[] = [];
  for (const [currency, b] of Array.from(byCurrency.entries()).sort((a, z) => a[0].localeCompare(z[0]))) {
    const netChange = b.operating.add(b.investing).add(b.financing);
    const closingComputed = b.opening.add(netChange);
    const reconciled = closingComputed.equals(b.closingDirect);
    sections.push({
      currency,
      operating: b.operating.toString(),
      investing: b.investing.toString(),
      financing: b.financing.toString(),
      netChange: netChange.toString(),
      openingCash: b.opening.toString(),
      closingCash: b.closingDirect.toString(),
      reconciled,
    });
  }
  return sections;
}
