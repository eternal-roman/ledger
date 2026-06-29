import { describe, it, expect } from 'vitest';
import { Money, FXRate } from '../../src/core/money.js';
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
      makeLine(eur, Money.from('85', 'EUR'), 'credit'),
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

  it('rejects line amounts finer than the currency scale (sub-cent)', () => {
    // Guard is now at Money.from construction — sub-scale amounts throw before an entry is built.
    expect(() => Money.from('0.001', 'USD')).toThrow('Money.from');
    expect(() => Money.from('0.123', 'USD')).toThrow('Money.from');
    // Valid 2-dp amounts are still accepted:
    expect(Money.from('0.01', 'USD').toString()).toBe('0.01 USD');
  });

  it('rejects a non-ISO effective date', () => {
    const e = new JournalEntry('bd', 'not-a-date', [
      makeLine(cash, usd(10), 'debit'), makeLine(equity, usd(10), 'credit'),
    ], 'bad date');
    const res = validateEntry(e);
    expect(res.ok).toBe(false);
    expect(res.violations.some(v => v.type === 'INVALID_DATE')).toBe(true);
  });

  it('rejects an impossible calendar date (2026-02-30)', () => {
    const e = new JournalEntry('bd2', '2026-02-30', [
      makeLine(cash, usd(10), 'debit'), makeLine(equity, usd(10), 'credit'),
    ], 'bad cal');
    expect(validateEntry(e).ok).toBe(false);
  });

  it('accepts a valid ISO effective date', () => {
    const e = new JournalEntry('gd', '2026-06-21', [
      makeLine(cash, usd(10), 'debit'), makeLine(equity, usd(10), 'credit'),
    ], 'good date');
    expect(validateEntry(e).ok).toBe(true);
  });

  it('createFxConversion rejects amounts inconsistent with a supplied rate', () => {
    const eurCash = new Account('110', 'EUR Cash', AccountType.Asset);
    const usdCash = new Account('100', 'USD Cash', AccountType.Asset);
    const clrEur = new Account('900', 'FX Clear EUR', AccountType.Liability);
    const clrUsd = new Account('901', 'FX Clear USD', AccountType.Liability);
    // 100 EUR @ 1.08 = 108 USD, but caller passes 200 USD.
    expect(() => createFxConversion('fxBad', '2026-06-21', eurCash, usdCash,
      Money.from('100', 'EUR'), Money.from('200', 'USD'), clrEur, clrUsd, 'bad fx', 'rate',
      new FXRate('EUR', 'USD', '1.08'))).toThrow(/rate|inconsisten/i);
  });

  it('createFxConversion accepts amounts consistent with a supplied rate', () => {
    const eurCash = new Account('110', 'EUR Cash', AccountType.Asset);
    const usdCash = new Account('100', 'USD Cash', AccountType.Asset);
    const clrEur = new Account('900', 'FX Clear EUR', AccountType.Liability);
    const clrUsd = new Account('901', 'FX Clear USD', AccountType.Liability);
    const legs = createFxConversion('fxOk', '2026-06-21', eurCash, usdCash,
      Money.from('100', 'EUR'), Money.from('108', 'USD'), clrEur, clrUsd, 'ok fx', 'rate',
      new FXRate('EUR', 'USD', '1.08'));
    expect(legs.length).toBe(2);
  });

  it('createFxConversion rejects exactly-one-minor-unit drift (no rounding-skim)', () => {
    const jpyCash = new Account('110', 'JPY Cash', AccountType.Asset);
    const usdCash = new Account('100', 'USD Cash', AccountType.Asset);
    const clrJpy = new Account('900', 'FX Clear JPY', AccountType.Liability);
    const clrUsd = new Account('901', 'FX Clear USD', AccountType.Liability);
    const rate = new FXRate('JPY', 'USD', '0.006789');
    // 100 JPY × 0.006789 = 0.6789 → rounds to 0.68 USD
    // 0.67 is exactly 1 minor unit off — must be rejected
    expect(() => createFxConversion('fx-skim', '2026-06-21', jpyCash, usdCash,
      Money.from(100, 'JPY'), Money.from('0.67', 'USD'), clrJpy, clrUsd,
      'skim attempt', 'test', rate)).toThrow(/inconsisten/i);
    // 0.68 (exact match) must still be accepted
    const legs = createFxConversion('fx-exact', '2026-06-21', jpyCash, usdCash,
      Money.from(100, 'JPY'), Money.from('0.68', 'USD'), clrJpy, clrUsd,
      'exact match', 'test', rate);
    expect(legs.length).toBe(2);
  });

  it('freezes line and entry tags (deep immutability)', () => {
    const line = makeLine(cash, usd(10), 'debit', { project: 'X' });
    expect(() => { (line as any).side = 'credit'; }).toThrow();
    expect(() => { (line.tags as any).project = 'Y'; }).toThrow();
    const e = new JournalEntry('t1', '2026-06-21', [line, makeLine(equity, usd(10), 'credit')], 'tags', undefined, { dept: 'A' });
    expect(() => { (e.tags as any).dept = 'B'; }).toThrow();
  });
});

describe('account identity consistency (H2)', () => {
  it('validateEntry rejects one code used as two different account types', () => {
    const asCash = new Account('1000', 'Cash', AccountType.Asset);
    const asLoan = new Account('1000', 'Loan', AccountType.Liability);
    const e = new JournalEntry('e1', '2026-06-21', [
      makeLine(asCash, Money.from('40', 'USD'), 'debit'),
      makeLine(asLoan, Money.from('40', 'USD'), 'credit'),
    ], 'collision');
    const r = validateEntry(e);
    expect(r.ok).toBe(false);
    expect(r.violations.some(v => v.type === 'ACCOUNT_REDEFINED')).toBe(true);
  });
});
