/**
 * Crypto exchange (CEX) example: fund an account, buy BTC with a taker fee, sell
 * part of it, and read realized P&L — all through the immutable double-entry kernel.
 */
// Support both "after npm install ledger" and "run from source tree"
const L: any = await (async () => {
  try { return await import('ledger'); } catch { return await import('../src/index.js'); }
})();

const {
  Money, emptyLedger,
  defaultAssetRegistry, installAssetScales,
  depositToEntry, fillToEntries, custodyAccount, cashAccount,
  realizedPnL, PriceBook, valuePortfolio,
} = L;

installAssetScales(defaultAssetRegistry());

let l = emptyLedger();
const post = (entries: any[]) => { for (const e of entries) l = l.apply(e).ledger; };

// 1) Fund the exchange with cash
post([depositToEntry('dep1', '2026-06-22', 'KRAKEN', Money.from('100000', 'USD'))]);

// 2) Buy 1 BTC @ 60,000 with a 30 USD taker fee
post(fillToEntries({
  id: 'buy1', effectiveDate: '2026-06-22', venue: 'KRAKEN', base: 'BTC', quote: 'USD',
  side: 'buy', quantity: Money.from('1', 'BTC'), price: Money.from('60000', 'USD'),
  fee: Money.from('30', 'USD'), liquidity: 'taker',
}));

// 3) Sell 0.4 BTC @ 65,000 (taker fee 26)
post(fillToEntries({
  id: 'sell1', effectiveDate: '2026-06-25', venue: 'KRAKEN', base: 'BTC', quote: 'USD',
  side: 'sell', quantity: Money.from('0.4', 'BTC'), price: Money.from('65000', 'USD'),
  fee: Money.from('26', 'USD'), liquidity: 'taker',
}));

console.log('BTC custody :', l.balance(custodyAccount('KRAKEN', 'BTC'), undefined, 'BTC').toString());
console.log('USD cash    :', l.balance(cashAccount('KRAKEN', 'USD'), undefined, 'USD').toString());

const pnl = realizedPnL(l, 'BTC', 'FIFO');
console.log('Realized P&L:', pnl.total.toString(), `(${pnl.byDisposal.length} disposal)`);

const book = new PriceBook([
  { asset: 'BTC', quote: 'USD', price: Money.from('65000', 'USD'), asOf: '2026-06-25', source: 'exchange-mark' },
]);
const nav = valuePortfolio(l, book, 'USD', '2026-06-25');
console.log('Portfolio NAV:', nav.total.toString(), `(uncited: ${nav.uncited.join(',') || 'none'})`);

console.log('Trial balance rows:', l.trialBalance().length);
console.log('Fundamental equation holds:', l.verifyFundamentalEquation());
