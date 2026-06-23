/**
 * Cross verification harness (TS side).
 * Builds a small sequence equivalent to py 01/12 cases and emits hash/eq/balances.
 * Run with: npx tsx ledger/audit_artifacts/cross_harness.ts
 */
import { Money } from '../../src/core/money.js';
import { Account, AccountType } from '../../src/core/account.js';
import { makeLine, createEntry } from '../../src/core/journal.js';
import { emptyLedger, runTrace } from '../../src/verify/index.js';

const cust = new Account('CUST:V:SH', 'Custody', AccountType.Asset);
const cash = new Account('CASH:V:USD', 'Cash', AccountType.Asset);
const clr = new Account('CLR:V:SH', 'Clr', AccountType.Asset);

function main() {
  const entries = [
    // Simplified equivalent to FIFO buy/sell (no full tags for this demo harness)
    createEntry('b1-base', '2026-06-22', [
      makeLine(cust, Money.from('10', 'SH'), 'debit'),
      makeLine(clr, Money.from('10', 'SH'), 'credit'),
    ], 'buy1'),
    createEntry('b1-q', '2026-06-22', [
      makeLine(clr, Money.from('1000', 'USD'), 'debit'),
      makeLine(cash, Money.from('1000', 'USD'), 'credit'),
    ], 'pay'),
    createEntry('s1-base', '2026-06-23', [
      makeLine(clr, Money.from('6', 'SH'), 'debit'),
      makeLine(cust, Money.from('6', 'SH'), 'credit'),
    ], 'sell1'),
    createEntry('s1-q', '2026-06-23', [
      makeLine(clr, Money.from('780', 'USD'), 'credit'),
      makeLine(cash, Money.from('780', 'USD'), 'debit'),
    ], 'recv'),
  ];

  const trace = runTrace(entries);
  console.log(JSON.stringify({
    finalHash: trace.finalHash,
    finalEquation: trace.finalEquation,
    balances: trace.finalLedger.trialBalance().map(({account, balance}) => ({code: account.code, bal: balance.toString()})),
    ops: entries.length,
  }, null, 2));
}

main();
