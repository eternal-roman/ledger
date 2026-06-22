/**
 * Portfolio rebalancing example: value a multi-asset book, measure drift from a
 * target allocation, and plan the trades to correct it (then execute one).
 */
import {
  Money, emptyLedger,
  defaultAssetRegistry, installAssetScales,
  depositToEntry, fillToEntries,
  PriceBook, valuePortfolio, allocationDrift, planRebalance,
} from '../src/index.js';

installAssetScales(defaultAssetRegistry());

let l = emptyLedger();
const post = (entries: any[]) => { for (const e of entries) l = l.apply(e).ledger; };

post([depositToEntry('dep1', '2026-06-22', 'BROKER', Money.from('100000', 'USD'))]);
post(fillToEntries({ id: 'b1', effectiveDate: '2026-06-22', venue: 'BROKER', base: 'BTC', quote: 'USD',
  side: 'buy', quantity: Money.from('1', 'BTC'), price: Money.from('60000', 'USD') }));

const book = new PriceBook([
  { asset: 'BTC', quote: 'USD', price: Money.from('60000', 'USD'), asOf: '2026-06-22', source: 'mark' },
  { asset: 'ETH', quote: 'USD', price: Money.from('3000', 'USD'), asOf: '2026-06-22', source: 'mark' },
]);

const v = valuePortfolio(l, book, 'USD', '2026-06-22');
console.log('NAV:', v.total.toString());

const target = { weights: { BTC: '0.5', ETH: '0.3', USD: '0.2' } };
console.log('\nDrift vs target:');
for (const d of allocationDrift(v, target)) {
  console.log(`  ${d.asset}: current ${d.current} target ${d.target} drift ${d.drift}`);
}

const plan = planRebalance(v, target, book, { minTrade: Money.from('100', 'USD') });
console.log('\nRebalance plan:');
for (const t of plan.trades) {
  console.log(`  ${t.side.toUpperCase()} ${t.quantity.toString()} (~${t.estValue.toString()})`);
}

// Execute the ETH buy leg as a demonstration
const ethBuy = plan.trades.find(t => t.asset === 'ETH');
if (ethBuy) {
  post(fillToEntries({ id: 'rb-eth', effectiveDate: '2026-06-22', venue: 'BROKER', base: 'ETH', quote: 'USD',
    side: 'buy', quantity: ethBuy.quantity, price: Money.from('3000', 'USD') }));
}
console.log('\nEquation holds after execution:', l.verifyFundamentalEquation());
