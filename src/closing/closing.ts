import { Account, AccountType } from '../core/account.js';
import { createBalancedEntry, JournalEntry } from '../core/journal.js';
import { Ledger } from '../core/ledger.js';
import { Money } from '../core/money.js';

/**
 * Retained earnings helper account factory (typical equity account).
 * Caller may supply their own chart code/name.
 */
export function createRetainedEarningsAccount(code = '3100', name = 'Retained Earnings'): Account {
  return new Account(code, name, AccountType.Equity);
}

/**
 * Generate balanced closing JournalEntry(s) that zero temporary accounts
 * (Income/Expense) into Retained Earnings for the given closeDate.
 *
 * Uses only public Ledger APIs (trialBalance + summarizeByType grouping) so
 * multi-currency ledgers are handled correctly. Never relies on the private
 * pickCurrency used by the minimal incomeStatement view.
 *
 * Every returned entry is created via createBalancedEntry so it is guaranteed
 * to pass validateEntry and preserve the fundamental equation when applied.
 *
 * Citations: attach matching principle + period closing canon.
 */
export function generateClosingEntries(
  ledger: Ledger,
  closeDate: string,
  retainedEarnings: Account = createRetainedEarningsAccount()
): JournalEntry[] {
  const entries: JournalEntry[] = [];
  const sums = ledger.summarizeByType();

  // Group by currency explicitly (trialBalance already gives one row per curr)
  const byCurrency = new Map<string, { income: Money; expense: Money }>();

  for (const s of sums) {
    if (!byCurrency.has(s.total.currency)) {
      byCurrency.set(s.total.currency, {
        income: Money.zero(s.total.currency),
        expense: Money.zero(s.total.currency),
      });
    }
    const g = byCurrency.get(s.total.currency)!;
    if (s.type === AccountType.Income) g.income = g.income.add(s.total);
    if (s.type === AccountType.Expense) g.expense = g.expense.add(s.total);
  }

  // Premium: discover the actual temporary accounts from the ledger and close each individually.
  // This zeros the real Income/Expense accounts (much better than synthetic "summary").
  const tempBalances = ledger.trialBalance()
    .filter(r => r.account.type === AccountType.Income || r.account.type === AccountType.Expense)
    .filter(r => !r.balance.isZero());

  let seq = 0;
  for (const { account: tempAcct, balance } of tempBalances) {
    if (tempAcct.type === AccountType.Income) {
      // Income has credit balance normally; to close: Dr Income, Cr RE
      entries.push(
        createBalancedEntry(
          `close-${tempAcct.code}-${closeDate}-${seq++}`,
          closeDate,
          tempAcct,           // debit the income account (zeros its credit bal)
          retainedEarnings,   // credit RE
          balance,
          `Close ${tempAcct.name} to retained earnings`,
          ['gaap-closing-entries-re', 'gaap-matching-principle-detail']
        )
      );
    } else {
      // Expense has debit balance; to close: Dr RE, Cr Expense
      entries.push(
        createBalancedEntry(
          `close-${tempAcct.code}-${closeDate}-${seq++}`,
          closeDate,
          retainedEarnings,
          tempAcct,           // credit the expense account (zeros its debit bal)
          balance,
          `Close ${tempAcct.name} to retained earnings`,
          ['gaap-closing-entries-re', 'gaap-matching-principle-detail']
        )
      );
    }
  }

  return entries;
}
