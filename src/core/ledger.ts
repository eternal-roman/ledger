import { JournalEntry, validateEntry, ValidationResult } from './journal.js';
import { Money } from './money.js';
import { Account } from './account.js';

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
    let totalDebit = Money.from(0, 'USD'); // placeholder; we will improve with currency handling
    let totalCredit = Money.from(0, 'USD');

    const relevant = this._entries.filter(e => !asOf || e.effectiveDate <= asOf);

    for (const entry of relevant) {
      for (const line of entry.lines) {
        if (line.account.code !== account.code) continue;

        if (line.side === 'debit') {
          // For simplicity in core v0 we assume single currency ledgers in tests
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

  /** Fundamental accounting equation check (very simplified core version) */
  verifyFundamentalEquation(): boolean {
    // In real system we would walk full CoA. Here a smoke test using known accounts.
    // For v0 kernel, we expose the ability and higher layers provide full CoA snapshot.
    return true; // Placeholder - will be made rigorous in next iterations with full CoA
  }
}

/** Helper to create initial ledger */
export function emptyLedger(): Ledger {
  return new Ledger([]);
}
