/**
 * Minimal correct-by-construction personal ledger example.
 * Demonstrates exact Money, double-entry enforcement, immutable Ledger,
 * and fundamental equation verification.
 */
import {
  Money,
  Account,
  AccountType,
  createBalancedEntry,
  emptyLedger,
} from '../src/index.js';

const checking = new Account('100', 'Checking Account', AccountType.Asset);
const salary = new Account('400', 'Salary Income', AccountType.Income);
const rent = new Account('500', 'Rent Expense', AccountType.Expense);
const savings = new Account('200', 'Savings', AccountType.Asset);

function main() {
  let ledger = emptyLedger();

  // Owner "deposits" salary (income)
  const salaryEntry = createBalancedEntry(
    'salary-2026-06',
    '2026-06-21',
    checking,
    salary,
    Money.from('5000', 'USD'),
    'June salary deposit'
  );
  ledger = ledger.apply(salaryEntry).ledger;

  // Pay rent
  const rentEntry = createBalancedEntry(
    'rent-2026-06',
    '2026-06-22',
    rent,
    checking,
    Money.from('1800', 'USD'),
    'Pay June rent'
  );
  ledger = ledger.apply(rentEntry).ledger;

  // Move some to savings
  const transfer = createBalancedEntry(
    'transfer-savings',
    '2026-06-23',
    savings,
    checking,
    Money.from('1000', 'USD'),
    'Move to emergency fund'
  );
  ledger = ledger.apply(transfer).ledger;

  console.log('Checking balance:', ledger.balance(checking).toString());
  console.log('Savings balance:', ledger.balance(savings).toString());

  const accounts = [checking, savings, salary, rent];
  const equationHolds = ledger.verifyFundamentalEquation(accounts);
  console.log('Fundamental equation holds:', equationHolds);

  // Demonstrate new APIs
  console.log('Income statement net:', ledger.incomeStatement().netIncome.toString());
  console.log('Balance sheet balanced:', ledger.balanceSheet().balanced);
  console.log('Zero check (savings after tx):', ledger.balance(savings).isZero() ? 'zero' : 'non-zero');
  const snap = ledger.snapshot();
  console.log('Snapshot asOf + entries:', snap.asOf, snap.entries.length);

  // All entries were validated at apply time
  console.log('Total entries:', ledger.entries.length);
}

main();
