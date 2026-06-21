import { JournalEntry, validateEntry, ValidationResult } from './journal.js';
import { Money } from './money.js';
import { Account, AccountType } from './account.js';

export interface LedgerSnapshot {
  readonly entries: readonly JournalEntry[];
  readonly asOf: string;
}

export class Ledger {
  private readonly _entries: JournalEntry[];

  constructor(entries: JournalEntry[] = []) {
    this._entries = [...entries]; // copy
  }

  get entries(): readonly JournalEntry[] {
    return this._entries;
  }

  /** Pure: returns new Ledger */
  apply(entry: JournalEntry): { ledger: Ledger; result: ValidationResult } {
    const result = validateEntry(entry);
    if (!result.ok) {
      return { ledger: this, result };
    }
    const newEntries = [...this._entries, entry];
    return {
      ledger: new Ledger(newEntries),
      result
    };
  }

  /** Pure function: balance for account as of date (simple sum, later can be more sophisticated) */
  balance(account: Account, asOf?: string): Money {
    // TODO: improve to respect per-account / entry currency for zeros
    let totalDebit = Money.from(0, 'USD');
    let totalCredit = Money.from(0, 'USD');

    const relevant = this._entries.filter(e => !asOf || e.effectiveDate <= asOf);

    for (const entry of relevant) {
      for (const line of entry.lines) {
        if (line.account.code !== account.code) continue;

        if (line.side === 'debit') {
          totalDebit = totalDebit.add(line.amount);
        } else {
          totalCredit = totalCredit.add(line.amount);
        }
      }
    }

    // Return net according to normal balance
    if (account.normalBalance === 'debit') {
      return totalDebit.sub(totalCredit);
    } else {
      return totalCredit.sub(totalDebit);
    }
  }

  /**
   * Verify the fundamental accounting equation.
   * Discovers accounts from entries if none provided.
   * Uses Assets + Expenses = Liabilities + Equity + Income  (pre-closing)
   */
  verifyFundamentalEquation(accounts?: Account[]): boolean {
    let accts = accounts;
    if (!accts || accts.length === 0) {
      const seen = new Map<string, Account>();
      for (const e of this._entries) {
        for (const l of e.lines) {
          if (!seen.has(l.account.code)) {
            seen.set(l.account.code, l.account);
          }
        }
      }
      accts = Array.from(seen.values());
    }

    let debitSide = Money.from(0, 'USD');
    let creditSide = Money.from(0, 'USD');

    for (const acct of accts) {
      const bal = this.balance(acct);
      const isDebitNormal = acct.type === AccountType.Asset || acct.type === AccountType.Expense;
      if (isDebitNormal) {
        debitSide = debitSide.add(bal);
      } else {
        creditSide = creditSide.add(bal);
      }
    }

    // Assets + Expenses == Liabilities + Equity + Income
    return debitSide.toDecimal().eq(creditSide.toDecimal());
  }
}

/** Helper to create initial ledger */
export function emptyLedger(): Ledger {
  return new Ledger([]);
}
