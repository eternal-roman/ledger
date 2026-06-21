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
    const relevant = this._entries.filter(e => !asOf || e.effectiveDate <= asOf);
    const accLines = relevant.flatMap(e => e.lines.filter(l => l.account.code === account.code));

    if (accLines.length === 0) {
      return Money.from(0, 'USD');
    }

    // Determine currency from actual lines for this account (support multi-curr)
    const currency = accLines[0].amount.currency;
    let totalDebit = Money.from(0, currency);
    let totalCredit = Money.from(0, currency);

    for (const line of accLines) {
      if (line.amount.currency !== currency) continue; // skip unexpected mixed for acct
      if (line.side === 'debit') {
        totalDebit = totalDebit.add(line.amount);
      } else {
        totalCredit = totalCredit.add(line.amount);
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
   * Supports multi-currency by checking equation holds within each currency.
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

    // Per-currency sides to support mixed-currency ledgers exactly
    const byCurr: Map<string, { debit: Money; credit: Money }> = new Map();

    for (const acct of accts) {
      const bal = this.balance(acct);
      const c = bal.currency;
      if (!byCurr.has(c)) {
        byCurr.set(c, { debit: Money.from(0, c), credit: Money.from(0, c) });
      }
      const s = byCurr.get(c)!;
      const isDebitNormal = acct.type === AccountType.Asset || acct.type === AccountType.Expense;
      if (isDebitNormal) {
        s.debit = s.debit.add(bal);
      } else {
        s.credit = s.credit.add(bal);
      }
    }

    // For each currency, Assets + Expenses == Liabilities + Equity + Income
    for (const { debit, credit } of byCurr.values()) {
      if (!debit.toDecimal().eq(credit.toDecimal())) {
        return false;
      }
    }
    return true;
  }
}

/** Helper to create initial ledger */
export function emptyLedger(): Ledger {
  return new Ledger([]);
}
