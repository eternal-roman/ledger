import { describe, it, expect } from 'vitest';
import { Money } from '../../src/core/money.js';
import { Account, AccountType } from '../../src/core/account.js';
import { JournalEntry, JournalEntryLine, validateEntry, makeLine } from '../../src/core/journal.js';

function usd(amount: string | number) {
  return Money.from(amount, 'USD');
}

describe('JournalEntry + validateEntry (double-entry kernel)', () => {
  const cash = new Account('1000', 'Cash', AccountType.Asset);
  const equity = new Account('3000', 'Owner Equity', AccountType.Equity);

  it('accepts balanced entry (debit cash, credit equity)', () => {
    const lines: JournalEntryLine[] = [
      makeLine(cash, usd(10000), 'debit'),
      makeLine(equity, usd(10000), 'credit'),
    ];
    const entry = new JournalEntry('e1', '2026-06-21', lines, 'Owner capital contribution');
    const result = validateEntry(entry);
    expect(result.ok).toBe(true);
  });

  it('rejects unbalanced entry with exact diff', () => {
    const lines: JournalEntryLine[] = [
      makeLine(cash, usd(10000), 'debit'),
      makeLine(equity, usd(9999), 'credit'),
    ];
    const entry = new JournalEntry('e2', '2026-06-21', lines, 'Bad unbalanced');
    const result = validateEntry(entry);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations[0].type).toBe('UNBALANCED');
      expect(result.violations[0].diff).toContain('1.00');
    }
  });

  it('rejects entry with mixed currencies without explicit FX leg (strict for core)', () => {
    const eur = new Account('1100', 'EUR Bank', AccountType.Asset);
    const lines: JournalEntryLine[] = [
      makeLine(cash, usd(100), 'debit'),
      makeLine(eur, Money.from(85, 'EUR'), 'credit'),
    ];
    const entry = new JournalEntry('e3', '2026-06-21', lines, 'Mixed currency attempt');
    const result = validateEntry(entry);
    expect(result.ok).toBe(false);
  });

  it('requires at least two lines', () => {
    const lines: JournalEntryLine[] = [makeLine(cash, usd(100), 'debit')];
    const entry = new JournalEntry('e4', '2026-06-21', lines, 'Single line');
    const result = validateEntry(entry);
    expect(result.ok).toBe(false);
  });

  it('entry is immutable (lines frozen)', () => {
    const lines = [makeLine(cash, usd(100), 'debit'), makeLine(equity, usd(100), 'credit')];
    const entry = new JournalEntry('e5', '2026-06-21', lines, 'Test immut');
    expect(() => {
      // @ts-expect-error runtime freeze check
      entry.lines.push(makeLine(cash, usd(50), 'debit'));
    }).toThrow();
  });
});
