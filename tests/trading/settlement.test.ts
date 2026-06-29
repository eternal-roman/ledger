import { describe, it, expect } from 'vitest';
import { Money, emptyLedger } from '../../src/index.js';
import { settleFill } from '../../src/trading/settlement.js';
import { fillToEntries } from '../../src/trading/postings.js';
import {
  cashAccount, settlementPayableAccount, settlementReceivableAccount,
} from '../../src/trading/accounts.js';
import type { Fill } from '../../src/trading/types.js';

const TRADE = '2025-01-01';
const SETTLE = '2025-01-03'; // T+2

function postAll(l: any, entries: any[]) {
  for (const e of entries) {
    const r = l.apply(e);
    expect(r.result.ok).toBe(true);
    l = r.ledger;
  }
  return l;
}

const buyFill: Fill = {
  id: 'buy1', effectiveDate: TRADE, venue: 'CB', base: 'XYZ', quote: 'USD', side: 'buy',
  quantity: Money.from('10', 'XYZ'), price: Money.from('100', 'USD'), fee: Money.from('5.00', 'USD'),
};

describe('Settlement-date (T+N) accounting', () => {
  it('defers cash to the settlement date via a payable on a buy', () => {
    const res = settleFill(buyFill, SETTLE);
    expect(res.settledCash.toString()).toBe('1005.00 USD'); // notional 1000 + fee 5

    let l = emptyLedger();
    l = postAll(l, res.tradeDate);

    const cash = cashAccount('CB', 'USD');
    const payable = settlementPayableAccount('CB', 'USD');

    // As of the trade date: no cash has moved; the payable holds the obligation.
    expect(l.balance(cash, TRADE, 'USD').toString()).toBe('0.00 USD');
    expect(l.balance(payable, TRADE, 'USD').toString()).toBe('1005.00 USD');

    // After settlement: payable nets to zero, cash has now left.
    l = postAll(l, res.settlement);
    expect(l.balance(payable, SETTLE, 'USD').isZero()).toBe(true);
    expect(l.balance(cash, SETTLE, 'USD').toString()).toBe('-1005.00 USD');
    expect(l.verifyFundamentalEquation()).toBe(true);
  });

  it('defers cash via a receivable on a sell', () => {
    const sellFill: Fill = {
      id: 'sell1', effectiveDate: TRADE, venue: 'CB', base: 'XYZ', quote: 'USD', side: 'sell',
      quantity: Money.from('10', 'XYZ'), price: Money.from('150', 'USD'), rebate: Money.from('3.00', 'USD'),
    };
    const res = settleFill(sellFill, SETTLE);
    expect(res.settledCash.toString()).toBe('1503.00 USD'); // notional 1500 + rebate 3

    let l = emptyLedger();
    l = postAll(l, res.tradeDate);
    const cash = cashAccount('CB', 'USD');
    const recv = settlementReceivableAccount('CB', 'USD');

    expect(l.balance(cash, TRADE, 'USD').toString()).toBe('0.00 USD');
    expect(l.balance(recv, TRADE, 'USD').toString()).toBe('1503.00 USD');

    l = postAll(l, res.settlement);
    expect(l.balance(recv, SETTLE, 'USD').isZero()).toBe(true);
    expect(l.balance(cash, SETTLE, 'USD').toString()).toBe('1503.00 USD');
    expect(l.verifyFundamentalEquation()).toBe(true);
  });

  it('settled result is economically identical to a spot fill (custody + cash + fee)', () => {
    // Spot ledger
    let spot = postAll(emptyLedger(), fillToEntries(buyFill));
    // Settled ledger (both trade-date and settlement posted)
    const res = settleFill(buyFill, SETTLE);
    let settled = postAll(postAll(emptyLedger(), res.tradeDate), res.settlement);

    const cash = cashAccount('CB', 'USD');
    expect(settled.balance(cash, SETTLE, 'USD').toString())
      .toBe(spot.balance(cash, undefined, 'USD').toString());
    // Both balanced.
    expect(spot.verifyFundamentalEquation()).toBe(true);
    expect(settled.verifyFundamentalEquation()).toBe(true);
  });

  it('rejects a settlement date before the trade date', () => {
    expect(() => settleFill(buyFill, '2024-12-31')).toThrow(/before trade date/);
  });

  it('rejects an invalid settlement date', () => {
    expect(() => settleFill(buyFill, '2025-13-01')).toThrow();
  });
});
