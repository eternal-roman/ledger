/**
 * IFRS 16 lessee — turn a lease schedule into balanced kernel journal entries.
 *
 * Every entry is a balanced double-entry built with the kernel factories, so each
 * one passes `validateEntry` and the whole sequence keeps the fundamental
 * accounting equation. Citations reference the IFRS 16 paragraphs that govern
 * each recognition.
 */
import { Account, AccountType } from '../../core/account.js';
import { createBalancedEntry, JournalEntry } from '../../core/journal.js';
import { buildSchedule, type LeaseInput } from './schedule.js';

/** Default chart of accounts for a basic lessee. Override via {@link LeaseAccounts}. */
export interface LeaseAccounts {
  rouAsset: Account;
  accumulatedDepreciation: Account; // contra-asset (credit balance)
  leaseLiability: Account;
  interestExpense: Account;
  depreciationExpense: Account;
  cash: Account;
}

export function defaultLeaseAccounts(): LeaseAccounts {
  return {
    rouAsset: new Account('1600', 'Right-of-Use Asset', AccountType.Asset),
    accumulatedDepreciation: new Account('1650', 'Accumulated Depreciation - ROU', AccountType.Asset),
    leaseLiability: new Account('2200', 'Lease Liability', AccountType.Liability),
    interestExpense: new Account('5300', 'Interest Expense', AccountType.Expense),
    depreciationExpense: new Account('5400', 'Depreciation Expense', AccountType.Expense),
    cash: new Account('1000', 'Cash', AccountType.Asset),
  };
}

/** Generate the full set of balanced journal entries for an IFRS 16 lessee. */
export function leaseToEntries(
  lease: LeaseInput,
  accounts: LeaseAccounts = defaultLeaseAccounts(),
): JournalEntry[] {
  const schedule = buildSchedule(lease);
  const entries: JournalEntry[] = [];

  // Commencement: recognise ROU asset and lease liability (IFRS 16.22–26).
  entries.push(
    createBalancedEntry(
      `${lease.id}-init`,
      lease.commencementDate,
      accounts.rouAsset,
      accounts.leaseLiability,
      schedule.initialRou,
      'Initial recognition of right-of-use asset and lease liability',
      ['IFRS 16.23-24', 'IFRS 16.26'],
    ),
  );

  for (const p of schedule.periods) {
    // Interest accretion on the lease liability (IFRS 16.36b).
    entries.push(
      createBalancedEntry(
        `${lease.id}-int-${p.period}`,
        p.date,
        accounts.interestExpense,
        accounts.leaseLiability,
        p.interest,
        `Interest on lease liability, period ${p.period}`,
        ['IFRS 16.36(b)', 'IFRS 16.37'],
      ),
    );
    // Lease payment reduces the liability (IFRS 16.36a).
    entries.push(
      createBalancedEntry(
        `${lease.id}-pay-${p.period}`,
        p.date,
        accounts.leaseLiability,
        accounts.cash,
        p.payment,
        `Lease payment, period ${p.period}`,
        ['IFRS 16.36(a)'],
      ),
    );
    // Straight-line depreciation of the ROU asset (IFRS 16.31).
    entries.push(
      createBalancedEntry(
        `${lease.id}-dep-${p.period}`,
        p.date,
        accounts.depreciationExpense,
        accounts.accumulatedDepreciation,
        p.depreciation,
        `Depreciation of right-of-use asset, period ${p.period}`,
        ['IFRS 16.31', 'IFRS 16.32'],
      ),
    );
  }

  return entries;
}
