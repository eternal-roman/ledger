import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { Money, registerScaleResolver } from '../../src/core/money.js';
import { Ledger, emptyLedger } from '../../src/core/ledger.js';
import { JournalEntry, makeLine, createEntry } from '../../src/core/journal.js';
import { Account, AccountType } from '../../src/core/account.js';
import { AssetRegistry, installAssetScales } from '../../src/instruments/index.js';
import { Fill, fillToEntries, depositToEntry, custodyAccount, LOT_TAGS } from '../../src/trading/index.js';
import { reliefFor, buildLots, realizedPnL, unrealizedPnL } from '../../src/portfolio/index.js';

// A unit-scale test asset keeps property quantities integer and exact.
const registry = new AssetRegistry([
  { symbol: 'USD', scale: 2, class: 'fiat' },
  { symbol: 'SH', scale: 0, class: 'equity' },
  { symbol: 'BTC', scale: 8, class: 'crypto' },
]);
beforeAll(() => installAssetScales(registry));
afterAll(() => registerScaleResolver(undefined));

function buy(id: string, qty: string, price: string, date = '2026-06-22'): Fill {
  return { id, effectiveDate: date, venue: 'V', base: 'SH', quote: 'USD', side: 'buy',
    quantity: Money.from(qty, 'SH'), price: Money.from(price, 'USD') };
}
function sell(id: string, qty: string, price: string, date = '2026-06-23'): Fill {
  return { id, effectiveDate: date, venue: 'V', base: 'SH', quote: 'USD', side: 'sell',
    quantity: Money.from(qty, 'SH'), price: Money.from(price, 'USD') };
}
function applyAll(fills: Fill[]): Ledger {
  let l = emptyLedger();
  for (const f of fills) for (const e of fillToEntries(f)) l = l.apply(e).ledger;
  return l;
}

describe('cost-basis lots & realized P&L', () => {
  it('FIFO realizes against the earliest lot first', () => {
    const l = applyAll([
      buy('b1', '10', '100'),  // basis 1000
      buy('b2', '10', '120'),  // basis 1200
      sell('s1', '15', '130'), // proceeds 1950
    ]);
    const r = realizedPnL(l, 'SH', 'FIFO');
    // FIFO: sell 10 @ basis 1000 + 5 of lot2 @ basis 600 => total basis 1600; proceeds 1950 => gain 350
    expect(r.total.toString()).toBe('350.00 USD');
    const open = buildLots(l, 'SH', 'FIFO');
    expect(open).toHaveLength(1);
    expect(open[0].quantity.toString()).toBe('5 SH');
    expect(open[0].costBasis.toString()).toBe('600.00 USD');
  });

  it('LIFO realizes against the latest lot first', () => {
    const l = applyAll([buy('b1', '10', '100'), buy('b2', '10', '120'), sell('s1', '15', '130')]);
    const r = realizedPnL(l, 'SH', 'LIFO');
    // LIFO: 10 @ 1200 + 5 of lot1 @ 500 => basis 1700; proceeds 1950 => gain 250
    expect(r.total.toString()).toBe('250.00 USD');
  });

  it('fails closed on oversell', () => {
    const l = applyAll([buy('b1', '5', '100'), sell('s1', '10', '110')]);
    expect(() => reliefFor(l, 'SH', 'FIFO')).toThrow(/oversell/i);
  });

  it('VULN-03: rejects acquire tag on a credit line (phantom lot prevention)', () => {
    // Construct a kernel-valid balanced entry where the custody line is incorrectly
    // tagged 'acquire' but sits on the credit side — reducing custody while opening a lot.
    const custAcct = new Account('CUST:V:SH', 'SH custody @ V', AccountType.Asset);
    const counterAcct = new Account('CLR:V:SH', 'SH clearing @ V', AccountType.Liability);
    const qty = Money.from('10', 'SH');
    const badEntry = createEntry('bad-1', '2026-06-22', [
      makeLine(counterAcct, qty, 'debit'),
      makeLine(custAcct, qty, 'credit', {
        [LOT_TAGS.tradeId]: 'bad-1', [LOT_TAGS.role]: 'acquire',
        [LOT_TAGS.quote]: 'USD', [LOT_TAGS.costBasis]: '1000',
      }),
    ], 'Mistagged acquire on credit');

    let l = emptyLedger();
    l = l.apply(badEntry).ledger;
    expect(() => reliefFor(l, 'SH', 'FIFO')).toThrow(/acquire.*credit|credit.*acquire/i);
  });

  it('VULN-03: rejects dispose tag on a debit line (side integrity)', () => {
    const custAcct = new Account('CUST:V:SH', 'SH custody @ V', AccountType.Asset);
    const counterAcct = new Account('CLR:V:SH', 'SH clearing @ V', AccountType.Liability);
    const qty = Money.from('5', 'SH');
    const badEntry = createEntry('bad-2', '2026-06-22', [
      makeLine(custAcct, qty, 'debit', {
        [LOT_TAGS.tradeId]: 'bad-2', [LOT_TAGS.role]: 'dispose',
        [LOT_TAGS.quote]: 'USD', [LOT_TAGS.proceeds]: '600',
      }),
      makeLine(counterAcct, qty, 'credit'),
    ], 'Mistagged dispose on debit');

    let l = emptyLedger();
    l = l.apply(badEntry).ledger;
    expect(() => reliefFor(l, 'SH', 'FIFO')).toThrow(/dispose.*debit|debit.*dispose/i);
  });

  it('unrealized P&L marks open lots against a cited price', () => {
    const l = applyAll([buy('b1', '10', '100')]);
    const open = buildLots(l, 'SH', 'FIFO');
    const u = unrealizedPnL(open, { asset: 'SH', quote: 'USD', price: Money.from('150', 'USD'), asOf: '2026-06-24', source: 'mark:test' });
    expect(u.marketValue.toString()).toBe('1500.00 USD');
    expect(u.costBasis.toString()).toBe('1000.00 USD');
    expect(u.unrealized.toString()).toBe('500.00 USD');
  });

  it('property: open lot quantity always equals the ledger custody balance', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        sellPct: fc.integer({ min: 0, max: 100 }),
        qty: fc.integer({ min: 1, max: 50 }),
        price: fc.integer({ min: 1, max: 500 }),
      }), { minLength: 1, maxLength: 12 }),
      (ops) => {
        const fills: Fill[] = [];
        let held = 0;
        let i = 0;
        for (const op of ops) {
          if (op.sellPct < 50 || held === 0) {
            fills.push(buy(`b${i}`, String(op.qty), String(op.price)));
            held += op.qty;
          } else {
            const q = Math.max(1, Math.floor((held * op.sellPct) / 100));
            const qty = Math.min(q, held);
            fills.push(sell(`s${i}`, String(qty), String(op.price)));
            held -= qty;
          }
          i++;
        }
        const l = applyAll(fills);
        const open = buildLots(l, 'SH', 'FIFO');
        const openQty = open.reduce((s, lot) => s.add(lot.quantity), Money.from('0', 'SH'));
        const custody = l.balance(custodyAccount('V', 'SH'), undefined, 'SH');
        expect(openQty.toDecimal().eq(custody.toDecimal())).toBe(true);
        expect(openQty.toDecimal().eq(held)).toBe(true);
      }
    ), { numRuns: 50 });
  });
});
