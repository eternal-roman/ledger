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
    this._entries = Object.freeze([...entries]) as JournalEntry[]; // copy + freeze for true immutability
  }

  get entries(): readonly JournalEntry[] {
    return Object.freeze([...this._entries]) as readonly JournalEntry[];
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

  /** Pure function: balance for account as of date (simple sum, later can be more sophisticated).
   * Optional currency selects which currency's net to return for multi-currency accounts.
   */
  balance(account: Account, asOf?: string, currency?: string): Money {
    const relevant = this._entries.filter(e => !asOf || e.effectiveDate <= asOf);
    const accLines = relevant.flatMap(e => e.lines.filter(l => l.account.code === account.code));

    if (accLines.length === 0) {
      // No activity for this account yet: zero using a currency already present in the ledger (if any)
      // to avoid surprising cross-currency default. USD fallback for brand new ledgers.
      const anyCurr = this._entries[0]?.lines[0]?.amount.currency;
      const zcurr = currency || anyCurr || 'USD';
      return Money.zero(zcurr);
    }

    // Determine currency from actual lines for this account (support multi-curr)
    const targetCurr = currency || accLines[0].amount.currency;
    let totalDebit = Money.zero(targetCurr);
    let totalCredit = Money.zero(targetCurr);

    for (const line of accLines) {
      if (line.amount.currency !== targetCurr) continue; // skip unexpected mixed for acct
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
        byCurr.set(c, { debit: Money.zero(c), credit: Money.zero(c) });
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

  /**
   * Trial balance: discovered accounts + their current net balances.
   * Useful for reports and AI-assisted verification of full set.
   */
  trialBalance(): Array<{ account: Account; balance: Money }> {
    const seen = new Map<string, Account>();
    for (const e of this._entries) {
      for (const l of e.lines) {
        if (!seen.has(l.account.code)) seen.set(l.account.code, l.account);
      }
    }
    return Array.from(seen.values()).map((account) => ({ account, balance: this.balance(account) }));
  }

  /**
   * Summarize net position by AccountType (aids equation checks and reporting).
   * Note: within-currency only for simplicity (multi-curr ledgers group per curr in verify).
   */
  summarizeByType(): Array<{ type: AccountType; total: Money }> {
    const groups = new Map<AccountType, Money>();
    for (const { account, balance } of this.trialBalance()) {
      const t = account.type;
      const curr = balance.currency;
      if (!groups.has(t)) groups.set(t, Money.zero(curr));
      const cur = groups.get(t)!;
      if (cur.currency === curr) {
        groups.set(t, cur.add(balance));
      }
    }
    return Array.from(groups.entries()).map(([type, total]) => ({ type, total }));
  }

  /** Capture current immutable snapshot (useful for audit / reporting). */
  snapshot(asOf = new Date().toISOString().slice(0, 10)): LedgerSnapshot {
    return { entries: this.entries, asOf };
  }

  /**
   * Minimal pre-closing income statement view (Income vs Expenses).
   * Returns nets using a consistent currency (prefers first non-USD seen).
   * Net = Income - Expenses (per normal balances in trial).
   */
  incomeStatement(): { totalIncome: Money; totalExpenses: Money; netIncome: Money } {
    const sums = this.summarizeByType();
    const pick = (t: AccountType) => sums.find(s => s.type === t)?.total || Money.zero('USD');
    let inc = pick(AccountType.Income);
    let exp = pick(AccountType.Expense);
    const curr = inc.currency !== 'USD' ? inc.currency : (exp.currency || 'USD');
    inc = inc.currency === curr ? inc : Money.zero(curr);
    exp = exp.currency === curr ? exp : Money.zero(curr);
    return { totalIncome: inc, totalExpenses: exp, netIncome: inc.sub(exp) };
  }

  /**
   * Minimal balance sheet view (Assets + Expenses vs Liabilities + Equity + Income).
   * Returns left and right sides for the accounting equation check.
   */
  balanceSheet(): { left: Money; right: Money; balanced: boolean } {
    const sums = this.summarizeByType();
    const get = (t: AccountType) => sums.find(s => s.type === t)?.total || Money.zero('USD');
    let assets = get(AccountType.Asset);
    let expenses = get(AccountType.Expense);
    let liab = get(AccountType.Liability);
    let equity = get(AccountType.Equity);
    let income = get(AccountType.Income);
    const curr = [assets, liab, equity, income, expenses].find(m => m.currency !== 'USD')?.currency || 'USD';
    const toC = (m: Money) => m.currency === curr ? m : Money.zero(curr);
    const left = toC(assets).add(toC(expenses));
    const right = toC(liab).add(toC(equity)).add(toC(income));
    return { left, right, balanced: left.toDecimal().eq(right.toDecimal()) };
  }
}

/** Helper to create initial ledger */
export function emptyLedger(): Ledger {
  return new Ledger([]);
}
