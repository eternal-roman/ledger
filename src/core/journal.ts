import { Money } from './money.js';
import { Account } from './account.js';

export type Side = 'debit' | 'credit';

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
    this.tags = tags ? { ...tags } : undefined;
  }
}

export interface ValidationViolation {
  type: 'UNBALANCED' | 'TOO_FEW_LINES' | 'CURRENCY_MIX' | 'INVALID_AMOUNT';
  message: string;
  diff?: string;
}

export interface ValidationResult {
  ok: boolean;
  violations: ValidationViolation[];
}

export function makeLine(account: Account, amount: Money, side: Side, tags?: Record<string, string>): JournalEntryLine {
  if (amount.toDecimal().lte(0)) throw new Error('Amount must be > 0 (use side for direction)');
  return { account, amount, side, tags: tags ? { ...tags } : undefined };
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
  rateSource?: string
): JournalEntry[] {
  if (foreignAmount.currency === domesticAmount.currency) throw new Error('FX currencies must differ');
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

  for (const line of entry.lines) {
    if (line.amount.toDecimal().lte(0)) {
      violations.push({ type: 'INVALID_AMOUNT', message: 'All line amounts must be strictly positive' });
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
