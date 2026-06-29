import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Money, registerScaleResolver } from '../../src/core/money.js';
import { emptyLedger } from '../../src/core/ledger.js';
import { validateEntry } from '../../src/core/journal.js';
import { defaultAssetRegistry, installAssetScales } from '../../src/instruments/index.js';
import { Fill, fillToEntries, depositToEntry, custodyAccount, cashAccount, tradingFeeAccount, rebateAccount } from '../../src/trading/index.js';
import { custodyAccount as custAcct } from '../../src/trading/accounts.js';

beforeAll(() => installAssetScales(defaultAssetRegistry()));
afterAll(() => registerScaleResolver(undefined));

function apply(ledger: ReturnType<typeof emptyLedger>, entries: any[]) {
  let l = ledger;
  for (const e of entries) {
    const r = l.apply(e);
    expect(r.result.ok).toBe(true);
    l = r.ledger;
  }
  return l;
}

describe('fillToEntries (trades -> balanced kernel entries)', () => {
  it('a taker buy balances per currency and keeps the fundamental equation', () => {
    let l = emptyLedger();
    l = apply(l, [depositToEntry('dep1', '2026-06-22', 'KRAKEN', Money.from('30030', 'USD'))]);

    const buy: Fill = {
      id: 'f1', effectiveDate: '2026-06-22', venue: 'KRAKEN',
      base: 'BTC', quote: 'USD', side: 'buy',
      quantity: Money.from('0.5', 'BTC'), price: Money.from('60000', 'USD'),
      fee: Money.from('30', 'USD'), liquidity: 'taker',
    };
    const entries = fillToEntries(buy);
    expect(entries).toHaveLength(2);
    for (const e of entries) expect(validateEntry(e).ok).toBe(true);

    l = apply(l, entries);
    expect(l.verifyFundamentalEquation()).toBe(true);
    expect(l.balance(custodyAccount('KRAKEN', 'BTC'), undefined, 'BTC').toString()).toBe('0.50000000 BTC');
    // cash fully spent: 30030 - (30000 notional + 30 fee) = 0
    expect(l.balance(cashAccount('KRAKEN', 'USD'), undefined, 'USD').toString()).toBe('0.00 USD');
    expect(l.balance(tradingFeeAccount('KRAKEN'), undefined, 'USD').toString()).toBe('30.00 USD');
  });

  it('a maker sell books a rebate as income', () => {
    let l = emptyLedger();
    // seed 1 BTC custody via a buy
    l = apply(l, [depositToEntry('dep1', '2026-06-22', 'KRAKEN', Money.from('60000', 'USD'))]);
    l = apply(l, fillToEntries({
      id: 'b1', effectiveDate: '2026-06-22', venue: 'KRAKEN', base: 'BTC', quote: 'USD',
      side: 'buy', quantity: Money.from('1', 'BTC'), price: Money.from('60000', 'USD'),
    }));

    const sell: Fill = {
      id: 's1', effectiveDate: '2026-06-23', venue: 'KRAKEN', base: 'BTC', quote: 'USD',
      side: 'sell', quantity: Money.from('1', 'BTC'), price: Money.from('61000', 'USD'),
      rebate: Money.from('10', 'USD'), liquidity: 'maker',
    };
    const entries = fillToEntries(sell);
    for (const e of entries) expect(validateEntry(e).ok).toBe(true);
    l = apply(l, entries);
    expect(l.verifyFundamentalEquation()).toBe(true);
    // proceeds + rebate = 61000 + 10 cash in
    expect(l.balance(cashAccount('KRAKEN', 'USD'), undefined, 'USD').toString()).toBe('61010.00 USD');
    expect(l.balance(rebateAccount('KRAKEN'), undefined, 'USD').toString()).toBe('10.00 USD');
    expect(l.balance(custodyAccount('KRAKEN', 'BTC'), undefined, 'BTC').toString()).toBe('0.00000000 BTC');
  });

  it('rejects fee and rebate together, and mismatched fee currency', () => {
    const base = { id: 'x', effectiveDate: '2026-06-22', venue: 'K', base: 'BTC', quote: 'USD',
      side: 'buy' as const, quantity: Money.from('1', 'BTC'), price: Money.from('1', 'USD') };
    expect(() => fillToEntries({ ...base, fee: Money.from('1', 'USD'), rebate: Money.from('1', 'USD') })).toThrow(/fee OR rebate/i);
    expect(() => fillToEntries({ ...base, fee: Money.from('1', 'EUR') })).toThrow(/quote/i);
  });
});

describe('VULN-04: account norm preserves symbol identity across separators', () => {
  it('distinct symbols with separators get distinct account codes', () => {
    const usdtClean = custAcct('BINANCE', 'USDT');
    const usdtHyphen = custAcct('BINANCE', 'USD-T');
    expect(usdtClean.code).toBe('CUST:BINANCE:USDT');
    expect(usdtHyphen.code).toBe('CUST:BINANCE:USD_T');
    expect(usdtClean.code).not.toBe(usdtHyphen.code);
  });

  it('clean symbols are unaffected by the change', () => {
    expect(custAcct('KRAKEN', 'BTC').code).toBe('CUST:KRAKEN:BTC');
    expect(custAcct('Kraken', 'btc').code).toBe('CUST:KRAKEN:BTC');
  });
});
