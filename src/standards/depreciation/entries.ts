import { Account, AccountType } from '../../core/account.js';
import { createBalancedEntry, JournalEntry } from '../../core/journal.js';
import { buildDepreciationSchedule, type DepInput } from './schedule.js';

export interface DepAccounts {
  depreciationExpense: Account;
  accumulatedDepreciation: Account;
}

export function defaultDepAccounts(): DepAccounts {
  return {
    depreciationExpense: new Account('6000', 'Depreciation Expense', AccountType.Expense),
    accumulatedDepreciation: new Account('1600', 'Accumulated Depreciation', AccountType.Asset),
  };
}

export function depreciationToEntries(input: DepInput, accounts: DepAccounts = defaultDepAccounts()): JournalEntry[] {
  const sched = buildDepreciationSchedule(input);
  const out: JournalEntry[] = [];
  sched.periods.forEach((p, i) => {
    out.push(
      createBalancedEntry(
        `${input.id}-dep-${i + 1}`,
        p.date,
        accounts.depreciationExpense,
        accounts.accumulatedDepreciation,
        p.depreciation,
        `Depreciation period ${i + 1}`,
        ['IAS 16.48', 'ASC 360-10-35']
      )
    );
  });
  return out;
}
