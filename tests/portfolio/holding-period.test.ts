import { describe, it, expect } from 'vitest';
import { Money, emptyLedger } from '../../src/index.js';
import { fillToEntries } from '../../src/trading/postings.js';
import { reliefFor } from '../../src/portfolio/lots.js';
import type { Fill } from '../../src/trading/types.js';

function buy(id: string, date: string, qty: string, price: string): Fill {
  return {
    id, effectiveDate: date, venue: 'CB', base: 'XYZ', quote: 'USD', side: 'buy',
    quantity: Money.from(qty, 'XYZ'), price: Money.from(price, 'USD'),
  };
}
function sell(id: string, date: string, qty: string, price: string): Fill {
  return {
    id, effectiveDate: date, venue: 'CB', base: 'XYZ', quote: 'USD', side: 'sell',
    quantity: Money.from(qty, 'XYZ'), price: Money.from(price, 'USD'),
  };
}

function post(l: any, fill: Fill) {
  for (const e of fillToEntries(fill)) {
    const r = l.apply(e);
    expect(r.result.ok).toBe(true);
    l = r.ledger;
  }
  return l;
}

describe('Holding-period classification on lot relief', () => {
  it('classifies a long-term disposal (>= 365 days)', () => {
    let l = emptyLedger();
    l = post(l, buy('b1', '2024-01-01', '10', '100'));   // basis 1000
    l = post(l, sell('s1', '2025-06-01', '10', '150'));   // ~517 days later

    const r = reliefFor(l, 'XYZ', 'FIFO');
    const d = r.realized[0];
    expect(d.term).toBe('long');
    expect(d.lots).toHaveLength(1);
    expect(d.lots[0].holdingDays).toBeGreaterThanOrEqual(365);
    expect(d.lots[0].term).toBe('long');
    expect(d.gain.toString()).toBe('500.00 USD'); // 1500 - 1000
  });

  it('classifies a short-term disposal (< 365 days)', () => {
    let l = emptyLedger();
    l = post(l, buy('b1', '2025-01-01', '10', '100'));
    l = post(l, sell('s1', '2025-03-01', '10', '120'));   // 59 days

    const d = reliefFor(l, 'XYZ', 'FIFO').realized[0];
    expect(d.term).toBe('short');
    expect(d.lots[0].holdingDays).toBe(59);
  });

  it('flags a disposal spanning short and long lots as mixed', () => {
    let l = emptyLedger();
    l = post(l, buy('b1', '2024-01-01', '5', '100'));     // long lot
    l = post(l, buy('b2', '2025-05-01', '5', '200'));     // short lot
    l = post(l, sell('s1', '2025-06-01', '10', '300'));   // consumes both (FIFO)

    const d = reliefFor(l, 'XYZ', 'FIFO').realized[0];
    expect(d.term).toBe('mixed');
    expect(d.lots).toHaveLength(2);
    expect(d.lots[0].term).toBe('long');
    expect(d.lots[1].term).toBe('short');
    // Per-slice basis + proceeds reconcile to disposal totals exactly.
    const basisSum = d.lots.reduce((a, s) => a.add(s.basis), Money.zero('USD'));
    const proceedsSum = d.lots.reduce((a, s) => a.add(s.proceeds), Money.zero('USD'));
    expect(basisSum.equals(d.basis)).toBe(true);
    expect(proceedsSum.equals(d.proceeds)).toBe(true);
  });

  it('honours a custom long-term threshold', () => {
    let l = emptyLedger();
    l = post(l, buy('b1', '2025-01-01', '1', '100'));
    l = post(l, sell('s1', '2025-07-01', '1', '100'));   // 181 days

    expect(reliefFor(l, 'XYZ', 'FIFO', { longTermThresholdDays: 180 }).realized[0].term).toBe('long');
    expect(reliefFor(l, 'XYZ', 'FIFO', { longTermThresholdDays: 200 }).realized[0].term).toBe('short');
  });
});
