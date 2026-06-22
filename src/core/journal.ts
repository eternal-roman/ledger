import { Money, FXRate } from './money.js';
import { Account } from './account.js';

export type Side = 'debit' | 'credit';

// Centralised in time/ for engine + fiscal periods (M0). Re-export keeps public surface stable.
import { isISODate } from '../time/index.js';
export { isISODate };

export interface JournalEntryLine {
  readonly account: Account;
  readonly amount: Money;
  readonly side: Side;
  readonly tags?: Record<string, string>; // e.g. { project: 'X', department: 'Y' }
}

export class JournalEntry {
  public readonly lines: readonly JournalEntryLine[];
  public readonly citations?: readonly string[]; // from knowledge fetch
  public readonly tags?: Record<string, string>; // entry-level tags

  constructor(
    public readonly id: string,
    public readonly effectiveDate: string,
    lines: JournalEntryLine[],
    public readonly description: string,
    citations?: string[],
    tags?: Record<string, string>
  ) {
    this.lines = Object.freeze([...lines]);
    this.citations = citations ? Object.freeze([...citations]) : undefined;
    this.tags = tags ? Object.freeze({ ...tags }) : undefined;
  }

  /** Deterministic serialization (pairs with fromJSON; roundtrips preserve hash/equation). */
  toJSON(): SerializedJournalEntry {
    return {
      v: '1',
      id: this.id,
      effectiveDate: this.effectiveDate,
      lines: this.lines.map(l => ({
        account: { code: l.account.code, name: l.account.name, type: l.account.type },
        amount: l.amount.toJSON(),
        side: l.side,
        tags: l.tags ? { ...l.tags } : undefined,
      })),
      description: this.description,
      citations: this.citations ? [...this.citations] : undefined,
      tags: this.tags ? { ...this.tags } : undefined,
    };
  }

  /** Rebuild validated entry from serialized form. Uses kernel factories so invariants re-enforced. */
  static fromJSON(j: any): JournalEntry {
    if (!j || j.v !== '1') throw new Error('JournalEntry.fromJSON: unsupported version or shape');
    if (!j.id || !j.effectiveDate || !Array.isArray(j.lines) || !j.description) {
      throw new Error('JournalEntry.fromJSON: missing required fields');
    }
    const lines: JournalEntryLine[] = j.lines.map((l: any) => {
      const acct = Account.fromJSON ? Account.fromJSON(l.account) : new Account(l.account.code, l.account.name, l.account.type);
      const amt = Money.fromJSON(l.amount);
      return makeLine(acct, amt, l.side, l.tags);
    });
    // createEntry validates + throws on any invariant break (fail-closed on bad persisted data)
    return createEntry(j.id, j.effectiveDate, lines, j.description, j.citations, j.tags);
  }
}

export interface ValidationViolation {
  type: 'UNBALANCED' | 'TOO_FEW_LINES' | 'CURRENCY_MIX' | 'INVALID_AMOUNT' | 'SUB_SCALE' | 'INVALID_DATE';
  message: string;
  diff?: string;
}

export interface ValidationResult {
  ok: boolean;
  violations: ValidationViolation[];
}

/** Serialized forms for persistence (exact, deterministic, versioned). */
export interface SerializedAccountRef {
  code: string;
  name: string;
  type: string; // AccountType string
}

export interface SerializedJournalEntryLine {
  account: SerializedAccountRef;
  amount: ReturnType<Money['toJSON']>;
  side: Side;
  tags?: Record<string, string>;
}

export interface SerializedJournalEntry {
  v: string;
  id: string;
  effectiveDate: string;
  lines: SerializedJournalEntryLine[];
  description: string;
  citations?: string[];
  tags?: Record<string, string>;
}

export function makeLine(account: Account, amount: Money, side: Side, tags?: Record<string, string>): JournalEntryLine {
  if (amount.toDecimal().lte(0)) throw new Error('Amount must be > 0 (use side for direction)');
  // Deep-freeze the line and its tags so a holder cannot mutate posted state.
  return Object.freeze({ account, amount, side, tags: tags ? Object.freeze({ ...tags }) : undefined });
}

/** Balanced 2-line entry. Throws on validation failure. */
export function createBalancedEntry(
  id: string,
  effectiveDate: string,
  debitAccount: Account,
  creditAccount: Account,
  amount: Money,
  description: string,
  citations?: string[],
  tags?: Record<string, string>
): JournalEntry {
  const lines = [
    makeLine(debitAccount, amount, 'debit'),
    makeLine(creditAccount, amount, 'credit'),
  ];
  return createEntry(id, effectiveDate, lines, description, citations, tags);
}

/** Compound or custom balanced entry. Validates + throws on failure. */
export function createEntry(
  id: string,
  effectiveDate: string,
  lines: JournalEntryLine[],
  description: string,
  citations?: string[],
  tags?: Record<string, string>
): JournalEntry {
  const entry = new JournalEntry(id, effectiveDate, lines, description, citations, tags);
  const validation = validateEntry(entry);
  if (!validation.ok) {
    throw new Error(`Failed to create entry: ${validation.violations.map(v => v.message).join(', ')}`);
  }
  return entry;
}

/**
 * FX conversion: two balanced per-currency entries (foreign + domestic).
 * Caller provides clearing accounts. Attach rate source as citation.
 */
export function createFxConversion(
  idBase: string,
  effectiveDate: string,
  foreignDebit: Account,
  domesticCredit: Account,
  foreignAmount: Money,
  domesticAmount: Money,
  clearingForeign: Account,
  clearingDomestic: Account,
  description: string,
  rateSource?: string,
  rate?: FXRate
): JournalEntry[] {
  if (foreignAmount.currency === domesticAmount.currency) throw new Error('FX currencies must differ');
  // When a rate is supplied, prove the two legs are economically consistent with it
  // (within one minor unit to allow rounding), so inconsistent FX cannot be booked.
  if (rate) {
    const expected = foreignAmount.convert(rate);
    if (expected.currency !== domesticAmount.currency) {
      throw new Error(`FX rate target ${expected.currency} != domestic ${domesticAmount.currency}`);
    }
    const s = domesticAmount.scale;
    const minorUnit = Money.from(s === 0 ? '1' : '0.' + '0'.repeat(s - 1) + '1', domesticAmount.currency);
    const diff = expected.sub(domesticAmount).abs();
    if (diff.compare(minorUnit) > 0) {
      throw new Error(
        `FX inconsistent with rate: ${foreignAmount.toString()} @ ${rate.rate} = ${expected.toString()}, but domestic is ${domesticAmount.toString()}`
      );
    }
  }
  const cites = rateSource ? [rateSource] : undefined;
  const legForeign = createEntry(`${idBase}-f`, effectiveDate, [
    makeLine(foreignDebit, foreignAmount, 'debit'),
    makeLine(clearingForeign, foreignAmount, 'credit')
  ], `${description} (FX foreign leg)`, cites);
  const legDomestic = createEntry(`${idBase}-d`, effectiveDate, [
    makeLine(clearingDomestic, domesticAmount, 'debit'),
    makeLine(domesticCredit, domesticAmount, 'credit')
  ], `${description} (FX domestic leg)`, cites);
  return [legForeign, legDomestic];
}

/**
 * Derive amount in target currency from source * rate (for FX spot calc).
 * Does NOT change the accounting; use exact computed values in createFxConversion.
 * Uses exact mul under the hood.
 */
export function fxDerivedAmount(source: Money, rate: string | number, targetCurrency: string): Money {
  const scaled = source.mul(rate);
  return Money.from(scaled.toDecimal().toString(), targetCurrency);
}

/**
 * Core kernel invariant: balanced double entry.
 * This is the foundation that must never be bypassed.
 */
export function validateEntry(entry: JournalEntry): ValidationResult {
  const violations: ValidationViolation[] = [];

  if (entry.lines.length < 2) {
    violations.push({ type: 'TOO_FEW_LINES', message: 'Journal entry must have at least two lines (double-entry)' });
  }

  if (!isISODate(entry.effectiveDate)) {
    violations.push({ type: 'INVALID_DATE', message: `effectiveDate must be a valid ISO date (YYYY-MM-DD); got "${entry.effectiveDate}"` });
  }

  for (const line of entry.lines) {
    if (line.amount.toDecimal().lte(0)) {
      violations.push({ type: 'INVALID_AMOUNT', message: 'All line amounts must be strictly positive' });
    }
    // Reject precision finer than the currency's minor unit (e.g. 0.001 USD).
    if (line.amount.toDecimal().decimalPlaces() > line.amount.scale) {
      violations.push({
        type: 'SUB_SCALE',
        message: `Amount ${line.amount.toDecimal().toString()} ${line.amount.currency} is finer than the ${line.amount.scale}-dp currency scale`,
      });
    }
  }

  // Group by currency
  const byCurrency = new Map<string, { debit: Money; credit: Money }>();

  for (const line of entry.lines) {
    const curr = line.amount.currency;
    if (!byCurrency.has(curr)) {
      byCurrency.set(curr, { debit: Money.zero(curr), credit: Money.zero(curr) });
    }
    const bucket = byCurrency.get(curr)!;

    if (line.side === 'debit') {
      bucket.debit = bucket.debit.add(line.amount);
    } else {
      bucket.credit = bucket.credit.add(line.amount);
    }
  }

  // For core, we are strict: each currency leg must balance independently (no implicit FX here)
  for (const [curr, { debit, credit }] of byCurrency) {
    if (!debit.toDecimal().eq(credit.toDecimal())) {
      const diff = debit.sub(credit).toString();
      violations.push({
        type: 'UNBALANCED',
        message: `Debits do not equal credits for ${curr}`,
        diff
      });
    }
  }

  // Detect mixed currencies in same entry (core requires explicit conversion legs or separate entries)
  if (byCurrency.size > 1) {
    violations.push({
      type: 'CURRENCY_MIX',
      message: 'Mixed currencies in one entry. Provide explicit FX conversion legs or split entries.'
    });
  }

  return {
    ok: violations.length === 0,
    violations
  };
}
