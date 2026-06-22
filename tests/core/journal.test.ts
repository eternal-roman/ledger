import { describe, it, expect } from 'vitest';
import { Money } from '../../src/core/money.js';
import { Account, AccountType } from '../../src/core/account.js';
import { JournalEntry, JournalEntryLine, validateEntry, makeLine, createEntry, createFxConversion, createBalancedEntry, fxDerivedAmount } from '../../src/core/journal.js';

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

  it('rejects zero or negative amount lines (INVALID_AMOUNT)', () => {
    const zeroLine = { account: cash, amount: usd(0), side: 'debit' as const };
    const negLine = { account: equity, amount: usd(-1), side: 'credit' as const };
    const bad = new JournalEntry('eZ', '2026-06-21', [zeroLine, negLine], 'zero/neg');
    const result = validateEntry(bad);
    expect(result.ok).toBe(false);
    expect(result.violations.some(v => v.type === 'INVALID_AMOUNT')).toBe(true);
  });

  it('entry is immutable (lines frozen)', () => {
    const lines = [makeLine(cash, usd(100), 'debit'), makeLine(equity, usd(100), 'credit')];
    const entry = new JournalEntry('e5', '2026-06-21', lines, 'Test immut');
    expect(() => {
      // @ts-expect-error runtime freeze check
      entry.lines.push(makeLine(cash, usd(50), 'debit'));
    }).toThrow();
  });

  it('createEntry supports compound (3+ line) balanced entries', () => {
    const rev = new Account('400', 'Revenue', AccountType.Income);
    const tax = new Account('210', 'Tax Payable', AccountType.Liability);
    const lines = [
      makeLine(cash, usd(100), 'debit'),
      makeLine(rev, usd(80), 'credit'),
      makeLine(tax, usd(20), 'credit')
    ];
    const entry = createEntry('comp-1', '2026-06-21', lines, 'Sale with tax');
    expect(validateEntry(entry).ok).toBe(true);
    expect(entry.lines.length).toBe(3);
  });

  it('createFxConversion produces two per-currency balanced legs', () => {
    const eurCash = new Account('110', 'EUR Cash', AccountType.Asset);
    const usdCash = new Account('100', 'USD Cash', AccountType.Asset);
    const clrEur = new Account('900', 'FX Clear EUR', AccountType.Liability);
    const clrUsd = new Account('901', 'FX Clear USD', AccountType.Liability);
    const legs = createFxConversion('fx1', '2026-06-21', eurCash, usdCash, Money.from('100', 'EUR'), Money.from('108', 'USD'), clrEur, clrUsd, 'Buy EUR spot', 'rate:1.08');
    expect(legs.length).toBe(2);
    expect(validateEntry(legs[0]).ok).toBe(true);
    expect(validateEntry(legs[1]).ok).toBe(true);
    expect(legs[0].lines[0].amount.currency).toBe('EUR');
    expect(legs[1].lines[0].amount.currency).toBe('USD');
  });

  it('fxDerivedAmount computes exact converted amount using Money.mul', () => {
    const eur100 = Money.from('100', 'EUR');
    const usd = fxDerivedAmount(eur100, '1.08', 'USD');
    expect(usd.toString()).toBe('108.00 USD');  // 100 * 1.08 = 108, scale 2
    expect(usd.currency).toBe('USD');
  });
});
