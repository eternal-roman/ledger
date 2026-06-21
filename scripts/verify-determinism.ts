/**
 * Determinism verification harness.
 * Builds a fixed sequence of entries twice and asserts identical hashes / balances.
 * Run with: npm run verify
 */
import { Money } from '../src/core/money.js';
import { Account, AccountType } from '../src/core/account.js';
import { JournalEntry, makeLine } from '../src/core/journal.js';
import { emptyLedger } from '../src/core/ledger.js';

function hash(str: string): string {
  // Simple stable hash for verification (real impl could use crypto)
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return h.toString(16);
}

const cash = new Account('1000', 'Cash', AccountType.Asset);
const equity = new Account('3000', 'Owner Equity', AccountType.Equity);

function makeCap(id: string, amt: string) {
  return new JournalEntry(
    id,
    '2026-06-01',
    [
      makeLine(cash, Money.from(amt, 'USD'), 'debit'),
      makeLine(equity, Money.from(amt, 'USD'), 'credit'),
    ],
    'Seed capital'
  );
}

function buildLedger() {
  let l = emptyLedger();
  l = l.apply(makeCap('c1', '10000')).ledger;
  l = l.apply(makeCap('c2', '2500')).ledger;
  return l;
}

function main() {
  const l1 = buildLedger();
  const l2 = buildLedger();

  const bal1 = l1.balance(cash).toHashable();
  const bal2 = l2.balance(cash).toHashable();

  const entryHash1 = hash(l1.entries.map(e => e.id).join('|'));
  const entryHash2 = hash(l2.entries.map(e => e.id).join('|'));

  console.log('Balance hash L1:', bal1);
  console.log('Balance hash L2:', bal2);
  console.log('Entry seq hash L1:', entryHash1);
  console.log('Entry seq hash L2:', entryHash2);

  const ok = bal1 === bal2 && entryHash1 === entryHash2;
  console.log(ok ? 'DETERMINISM OK' : 'DETERMINISM FAILED');
  process.exit(ok ? 0 : 1);
}

main();
