import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Money, registerScaleResolver } from '../../src/core/money.js';
import { emptyLedger } from '../../src/core/ledger.js';
import { defaultAssetRegistry, installAssetScales } from '../../src/instruments/index.js';
import { depositToEntry, fillToEntries, Fill } from '../../src/trading/index.js';
import { PriceBook, valuePortfolio } from '../../src/portfolio/index.js';
import { planRebalance, allocationDrift } from '../../src/investing/index.js';

beforeAll(() => installAssetScales(defaultAssetRegistry()));
afterAll(() => registerScaleResolver(undefined));

function buy(id: string, base: string, qty: string, price: string): Fill {
  return { id, effectiveDate: '2026-06-22', venue: 'V', base, quote: 'USD', side: 'buy',
    quantity: Money.from(qty, base), price: Money.from(price, 'USD') };
}

describe('portfolio valuation & rebalancing', () => {
  it('values multi-asset holdings into a reporting currency with cited marks', () => {
    let l = emptyLedger();
    l = l.apply(depositToEntry('d', '2026-06-22', 'V', Money.from('100000', 'USD'))).ledger;
    for (const e of fillToEntries(buy('b1', 'BTC', '1', '60000'))) l = l.apply(e).ledger;
    for (const e of fillToEntries(buy('b2', 'ETH', '10', '3000'))) l = l.apply(e).ledger;

    const book = new PriceBook([
      { asset: 'BTC', quote: 'USD', price: Money.from('60000', 'USD'), asOf: '2026-06-22', source: 'coinbase' },
      { asset: 'ETH', quote: 'USD', price: Money.from('3000', 'USD'), asOf: '2026-06-22', source: 'coinbase' },
    ]);
    const v = valuePortfolio(l, book, 'USD');
    // 1 BTC = 60000, 10 ETH = 30000, cash = 100000 - 60000 - 30000 = 10000 => NAV 100000
    expect(v.total.toString()).toBe('100000.00 USD');
    expect(v.uncited).toEqual([]);
  });

  it('lists uncited assets instead of silently valuing them', () => {
    let l = emptyLedger();
    l = l.apply(depositToEntry('d', '2026-06-22', 'V', Money.from('60000', 'USD'))).ledger;
    for (const e of fillToEntries(buy('b1', 'BTC', '1', '60000'))) l = l.apply(e).ledger;
    const v = valuePortfolio(l, new PriceBook([]), 'USD');
    expect(v.uncited).toContain('BTC');
  });

  it('plans rebalancing trades toward target weights', () => {
    let l = emptyLedger();
    l = l.apply(depositToEntry('d', '2026-06-22', 'V', Money.from('100000', 'USD'))).ledger;
    for (const e of fillToEntries(buy('b1', 'BTC', '1', '60000'))) l = l.apply(e).ledger;

    const book = new PriceBook([
      { asset: 'BTC', quote: 'USD', price: Money.from('60000', 'USD'), asOf: '2026-06-22', source: 'mark' },
      { asset: 'ETH', quote: 'USD', price: Money.from('3000', 'USD'), asOf: '2026-06-22', source: 'mark' },
    ]);
    const v = valuePortfolio(l, book, 'USD'); // NAV 100000: 60000 BTC + 40000 cash
    const target = { weights: { BTC: '0.5', ETH: '0.3', USD: '0.2' } };

    const drift = allocationDrift(v, target);
    expect(drift.find(d => d.asset === 'BTC')!.drift).toBe('0.1'); // 0.6 current - 0.5 target

    const plan = planRebalance(v, target, book, { minTrade: Money.from('100', 'USD') });
    const btc = plan.trades.find(t => t.asset === 'BTC');
    const eth = plan.trades.find(t => t.asset === 'ETH');
    expect(btc!.side).toBe('sell');                       // overweight BTC -> sell ~10000
    expect(btc!.quantity.toString()).toBe('0.16666667 BTC');
    expect(eth!.side).toBe('buy');                        // 0 -> 30000 target
    expect(eth!.quantity.toString()).toBe('10.000000000000000000 ETH');
  });
});
