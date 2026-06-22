import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Money, registerScaleResolver } from '../../src/core/money.js';
import { Account, AccountType } from '../../src/core/account.js';
import { makeLine, validateEntry, createBalancedEntry } from '../../src/core/journal.js';
import { JournalEntry } from '../../src/core/journal.js';
import { AssetRegistry, defaultAssetRegistry, installAssetScales } from '../../src/instruments/index.js';

describe('AssetRegistry', () => {
  it('dedupes by symbol, is pure on add, and roundtrips JSON', () => {
    const r = new AssetRegistry([{ symbol: 'btc', scale: 8, class: 'crypto' }]);
    expect(r.scaleOf('BTC')).toBe(8);
    const r2 = r.add({ symbol: 'ETH', scale: 18, class: 'crypto' });
    expect(r.has('ETH')).toBe(false); // original unchanged (pure)
    expect(r2.scaleOf('ETH')).toBe(18);
    expect(() => r.add({ symbol: 'BTC', scale: 8, class: 'crypto' })).toThrow(/duplicate/i);
    const back = AssetRegistry.fromJSON(r2.toJSON());
    expect(back.scaleOf('BTC')).toBe(8);
    expect(back.scaleOf('ETH')).toBe(18);
  });

  it('rejects negative or non-integer scales', () => {
    expect(() => new AssetRegistry([{ symbol: 'X', scale: -1, class: 'crypto' }])).toThrow(/scale/i);
    expect(() => new AssetRegistry([{ symbol: 'X', scale: 1.5, class: 'crypto' }])).toThrow(/scale/i);
  });
});

describe('asset-aware Money scale (additive resolver)', () => {
  afterAll(() => registerScaleResolver(undefined));

  it('does NOT change fiat behavior once a registry is installed', () => {
    installAssetScales(defaultAssetRegistry());
    // Identical to the core money tests — fiat path must be byte-for-byte unchanged.
    expect(Money.from('0.1', 'USD').add(Money.from('0.2', 'USD')).toString()).toBe('0.30 USD');
    expect(Money.from('1234', 'JPY').scale).toBe(0);
    expect(Money.from('1234', 'JPY').toString()).toBe('1234 JPY');
    expect(Money.from('1234.56', 'USD').scale).toBe(2);
  });

  it('gives registered assets their correct scale', () => {
    installAssetScales(defaultAssetRegistry());
    expect(Money.from('0.5', 'BTC').scale).toBe(8);
    expect(Money.from('0.00000001', 'BTC').toString()).toBe('0.00000001 BTC');
    expect(Money.from('1', 'ETH').scale).toBe(18);
  });

  it('SUB_SCALE rejects precision finer than the asset scale', () => {
    installAssetScales(defaultAssetRegistry());
    const a = new Account('CUST:X:BTC', 'btc', AccountType.Asset);
    const b = new Account('CLR:X:BTC', 'clr', AccountType.Liability);
    // 9 dp on an 8-dp asset -> SUB_SCALE
    const bad = new JournalEntry('e1', '2026-06-22', [
      makeLine(a, Money.from('0.000000005', 'BTC'), 'debit'),
      makeLine(b, Money.from('0.000000005', 'BTC'), 'credit'),
    ], 'sub-scale btc');
    const v = validateEntry(bad);
    expect(v.ok).toBe(false);
    expect(v.violations.some(x => x.type === 'SUB_SCALE')).toBe(true);

    // 8 dp is fine
    const ok = createBalancedEntry('e2', '2026-06-22', a, b, Money.from('0.00000001', 'BTC'), 'ok btc');
    expect(validateEntry(ok).ok).toBe(true);
  });
});
