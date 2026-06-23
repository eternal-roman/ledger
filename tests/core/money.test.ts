import { describe, it, expect, afterAll } from 'vitest';
import { Money, FXRate, registerScaleResolver } from '../../src/core/money.js';
import { Account, AccountType } from '../../src/core/account.js';
import { createBalancedEntry, validateEntry } from '../../src/core/journal.js';

describe('Money - exact arithmetic (no floats ever)', () => {
  // Some tests below toggle the process-global scale resolver; restore the
  // default (none installed) afterward, matching the cleanup pattern used in
  // the instruments/crypto/portfolio test suites.
  afterAll(() => registerScaleResolver(undefined));

  it('0.1 + 0.2 === 0.3 exactly in USD', () => {
    const a = Money.from('0.1', 'USD');
    const b = Money.from('0.2', 'USD');
    const sum = a.add(b);
    expect(sum.toString()).toBe('0.30 USD');
    expect(sum.toDecimal().toString()).toBe('0.3');
  });

  it('rejects currency mismatch on add', () => {
    const usd = Money.from('10', 'USD');
    const eur = Money.from('10', 'EUR');
    expect(() => usd.add(eur)).toThrow(/currency/i);
  });

  it('is immutable', () => {
    const m1 = Money.from('5.00', 'USD');
    const m2 = m1.add(Money.from('1', 'USD'));
    expect(m1.toString()).toBe('5.00 USD');
    expect(m2.toString()).toBe('6.00 USD');
    expect(m1).not.toBe(m2);
  });

  it('supports asOf and provenance (for determinism + trace)', () => {
    const m = Money.from('100', 'USD', '2026-06-21');
    expect(m.asOf).toBe('2026-06-21');
  });

  it('from number is converted exactly via string path', () => {
    const m = Money.from('0.1', 'USD');
    expect(m.toString()).toMatch(/^0\.1/);
  });

  it('respects currency scale (JPY has 0 decimals)', () => {
    const jpy = Money.from('1234', 'JPY');
    expect(jpy.scale).toBe(0);
    expect(jpy.toString()).toBe('1234 JPY');

    const usd = Money.from('1234.56', 'USD');
    expect(usd.scale).toBe(2);
    expect(usd.toString()).toBe('1234.56 USD');
  });

  it('Money.zero produces exact zero and equals works', () => {
    const z1 = Money.zero('USD');
    const z2 = Money.from('0', 'USD');
    const z3 = Money.zero('EUR');
    expect(z1.toString()).toBe('0.00 USD');
    expect(z1.equals(z2)).toBe(true);
    expect(z1.equals(z3)).toBe(false);
    expect(z1.equals(Money.from('0.00', 'USD'))).toBe(true);
    expect(z1.isZero()).toBe(true);
    expect(Money.from('1', 'USD').isZero()).toBe(false);
  });

  it('div is exact and respects scale', () => {
    const m = Money.from('10', 'USD');
    expect(m.div(4).toString()).toBe('2.50 USD');
    const jpy = Money.from('1000', 'JPY');
    expect(jpy.div(3).toString()).toBe('333 JPY'); // floor to scale 0
  });

  it('compare works for same currency only', () => {
    const a = Money.from('100', 'USD');
    const b = Money.from('50', 'USD');
    expect(a.compare(b)).toBe(1);
    expect(b.compare(a)).toBe(-1);
    expect(a.compare(Money.from('100', 'USD'))).toBe(0);
    expect(() => a.compare(Money.from('100', 'EUR'))).toThrow(/currency/i);
  });

  it('allocate splits exactly (parts sum to original, kernel invariant)', () => {
    const total = Money.from('100', 'USD');
    const parts = total.allocate([1, 1, 1]); // 3 equal parts
    expect(parts.length).toBe(3);
    expect(parts[0].toString()).toBe('33.33 USD');
    expect(parts[1].toString()).toBe('33.33 USD');
    expect(parts[2].toString()).toBe('33.34 USD'); // remainder
    const sum = parts[0].add(parts[1]).add(parts[2]);
    expect(sum.toString()).toBe('100.00 USD');
    expect(sum.equals(total)).toBe(true);
  });

  it('allocate with string ratios and zero ratio handling', () => {
    const total = Money.from('12', 'USD');
    const parts = total.allocate(['1', '2', '0']);
    expect(parts.map(p => p.toString())).toEqual(['4.00 USD', '8.00 USD', '0.00 USD']);
  });

  it('allocate used in kernel entry preserves invariants (validateEntry + equation)', () => {
    const cash = new Account('100', 'Cash', AccountType.Asset);
    const equity = new Account('300', 'Equity', AccountType.Equity);
    const total = Money.from('100', 'USD');
    const [owner, partner] = total.allocate([3, 2]); // 60/40
    const entry = createBalancedEntry(
      'alloc-1', '2026-06-21',
      cash, equity,
      total, 'Capital split'
    );
    expect(validateEntry(entry).ok).toBe(true);
    const sumAlloc = owner.add(partner);
    expect(sumAlloc.equals(total)).toBe(true);
  });

  it('negate and abs preserve value and currency', () => {
    const m = Money.from('42.5', 'USD');
    expect(m.negate().toString()).toBe('-42.50 USD');
    expect(m.negate().negate().equals(m)).toBe(true);
    expect(m.abs().toString()).toBe('42.50 USD');
  });

  it('toJSON/fromJSON roundtrip exact, with version', () => {
    const m = Money.from('123.45', 'EUR', '2026-06-21', 'source');
    const j = m.toJSON();
    expect(j.v).toBe('1');
    const m2 = Money.fromJSON(j);
    expect(m2.equals(m)).toBe(true);
    expect(m2.asOf).toBe('2026-06-21');
  });

  it('fromJSON restores explicit asset scale even with no resolver installed', () => {
    registerScaleResolver(undefined); // simulate: asset registry not installed
    const btc = Money.from('0.50000000', 'BTC', undefined, undefined, 8);
    expect(btc.scale).toBe(8);

    const restored = Money.fromJSON(btc.toJSON());
    expect(restored.scale).toBe(8);
    expect(restored.toString()).toBe('0.50000000 BTC');
  });

  it('rejects non-integer number input (no silent float capture)', () => {
    // The float trap: 0.1 + 0.2 === 0.30000000000000004 in IEEE-754.
    expect(() => Money.from(0.1 + 0.2, 'USD')).toThrow(/string|float|integer/i);
    expect(() => Money.from(0.1, 'USD')).toThrow(/string|float|integer/i);
    // Strings (exact) and whole-number integers remain valid.
    expect(Money.from('0.30', 'USD').toString()).toBe('0.30 USD');
    expect(Money.from(100, 'USD').toString()).toBe('100.00 USD');
    expect(Money.from(-5, 'USD').toDecimal().toString()).toBe('-5');
  });
});

describe('FXRate - exact conversion (never floats)', () => {
  it('stores rate exactly without parseFloat precision loss', () => {
    const r = new FXRate('usd', 'eur', '0.123456789012345678');
    expect(r.from).toBe('USD');
    expect(r.to).toBe('EUR');
    expect(r.rate).toBe('0.123456789012345678'); // exact canonical string, not a float
  });

  it('convert multiplies exactly and rounds to target currency scale', () => {
    const usd = Money.from('1000000', 'USD');
    const r = new FXRate('USD', 'EUR', '0.123456789012345678');
    const eur = usd.convert(r);
    expect(eur.currency).toBe('EUR');
    expect(eur.toString()).toBe('123456.79 EUR'); // HALF_UP to 2dp
    // No sub-cent dust left in the stored amount.
    expect(eur.toDecimal().decimalPlaces()).toBeLessThanOrEqual(2);
  });

  it('convert respects target currency scale (JPY = 0 dp)', () => {
    const usd = Money.from('100', 'USD');
    const r = new FXRate('USD', 'JPY', '156.789');
    const jpy = usd.convert(r);
    expect(jpy.toString()).toBe('15679 JPY'); // 15678.9 -> 15679 HALF_UP, 0 dp
    expect(jpy.toDecimal().decimalPlaces()).toBe(0);
  });

  it('convert rejects a from-currency mismatch', () => {
    const eur = Money.from('100', 'EUR');
    const r = new FXRate('USD', 'EUR', '0.9');
    expect(() => eur.convert(r)).toThrow(/FX|mismatch/i);
  });
});
