/**
 * Investment returns example: time-weighted (TWR) and money-weighted (IRR) returns
 * computed deterministically in exact decimal.
 */
// Support both "after npm install ledger" and "run from source tree"
const L: any = await (async () => {
  try { return await import('ledger'); } catch { return await import('../src/index.js'); }
})();

const { Money, timeWeightedReturn, moneyWeightedReturn } = L;

const twr = timeWeightedReturn([
  { begin: Money.from('10000', 'USD'), end: Money.from('11000', 'USD'), flow: Money.from('0', 'USD') },
  { begin: Money.from('11000', 'USD'), end: Money.from('13200', 'USD'), flow: Money.from('1000', 'USD') },
]);
console.log('Time-weighted return:', twr, `(${(Number(twr) * 100).toFixed(2)}%)`);

const irr = moneyWeightedReturn([
  { date: '2024-01-01', amount: Money.from('-10000', 'USD') },
  { date: '2024-07-01', amount: Money.from('-5000', 'USD') },
  { date: '2025-01-01', amount: Money.from('16500', 'USD') },
]);
console.log('Money-weighted (IRR):', irr.irr, `converged=${irr.converged} iterations=${irr.iterations}`);
