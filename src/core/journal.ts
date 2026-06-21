import { Money } from './money.js';
import { Account } from './account.js';

export type Side = 'debit' | 'credit';

export interface JournalEntryLine {
  readonly account: Account;
  readonly amount: Money;
  readonly side: Side;
}

export class JournalEntry {
  public readonly lines: readonly JournalEntryLine[];
  public readonly citations?: readonly string[]; // from knowledge fetch

  constructor(
    public readonly id: string,
    public readonly effectiveDate: string,
    lines: JournalEntryLine[],
    public readonly description: string,
    citations?: string[]
  ) {
    this.lines = Object.freeze([...lines]);
    this.citations = citations ? Object.freeze([...citations]) : undefined;
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

export function makeLine(account: Account, amount: Money, side: Side): JournalEntryLine {
  if (amount.toDecimal().isNeg()) {
    throw new Error('Amount must be positive. Use side (debit/credit) to indicate direction.');
  }
  return { account, amount, side };
}

/**
 * Convenience helper: create a balanced two-line JournalEntry.
 * Automatically validates and throws on invariant failure.
 */
export function createBalancedEntry(
  id: string,
  effectiveDate: string,
  debitAccount: Account,
  creditAccount: Account,
  amount: Money,
  description: string,
  citations?: string[]
): JournalEntry {
  const lines = [
    makeLine(debitAccount, amount, 'debit'),
    makeLine(creditAccount, amount, 'credit'),
  ];
  const entry = new JournalEntry(id, effectiveDate, lines, description, citations);
  const validation = validateEntry(entry);
  if (!validation.ok) {
    throw new Error(`Failed to create balanced entry: ${validation.violations.map(v => v.message).join(', ')}`);
  }
  return entry;
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

  // Group by currency
  const byCurrency = new Map<string, { debit: Money; credit: Money }>();

  for (const line of entry.lines) {
    const curr = line.amount.currency;
    if (!byCurrency.has(curr)) {
      byCurrency.set(curr, { debit: Money.from(0, curr), credit: Money.from(0, curr) });
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
