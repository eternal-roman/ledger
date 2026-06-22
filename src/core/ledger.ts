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
      // No activity: prefer explicit currency, else any present in ledger, else USD (brand new empty only).
      const anyCurr = this._entries[0]?.lines[0]?.amount.currency;
      const zcurr = currency || anyCurr || this.pickCurrency('USD');
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
   * Stable audit hash over the entry sequence (for reproducibility / Merkle-style proof).
   * Deterministic; includes all amounts, currencies, ids.
   */
  auditHash(): string {
    let h = '';
    for (const e of this._entries) {
      h += e.id + ':';
      for (const l of e.lines) {
        h += l.side + l.amount.toHashable() + ';';
      }
      h += '|';
    }
    return h;
  }

  /**
   * Pick a primary currency for reporting: first non-USD seen, else first, else fallback.
   * Reduces hard-coded USD surprises for non-USD or multi-currency ledgers.
   */
  private pickCurrency(fallback = 'USD'): string {
    for (const e of this._entries) {
      for (const l of e.lines) {
        if (l.amount.currency !== 'USD') return l.amount.currency;
      }
    }
    return this._entries[0]?.lines[0]?.amount.currency || fallback;
  }

  /**
   * Minimal pre-closing income statement view (Income vs Expenses).
   * Uses primary currency from ledger content (non-USD preferred) or fallback.
   */
  incomeStatement(): { totalIncome: Money; totalExpenses: Money; netIncome: Money } {
    const sums = this.summarizeByType();
    const curr = this.pickCurrency();
    const pick = (t: AccountType) => {
      const s = sums.find(s => s.type === t)?.total;
      return s && s.currency === curr ? s : Money.zero(curr);
    };
    const inc = pick(AccountType.Income);
    const exp = pick(AccountType.Expense);
    return { totalIncome: inc, totalExpenses: exp, netIncome: inc.sub(exp) };
  }

  /**
   * Minimal balance sheet view (Assets + Expenses vs Liabilities + Equity + Income).
   * Uses primary currency; reports balanced status per equation.
   */
  balanceSheet(): { left: Money; right: Money; balanced: boolean } {
    const sums = this.summarizeByType();
    const curr = this.pickCurrency();
    const get = (t: AccountType) => {
      const s = sums.find(s => s.type === t)?.total;
      return s && s.currency === curr ? s : Money.zero(curr);
    };
    const assets = get(AccountType.Asset);
    const expenses = get(AccountType.Expense);
    const liab = get(AccountType.Liability);
    const equity = get(AccountType.Equity);
    const income = get(AccountType.Income);
    const left = assets.add(expenses);
    const right = liab.add(equity).add(income);
    return { left, right, balanced: left.toDecimal().eq(right.toDecimal()) };
  }
}

/** Helper to create initial ledger */
export function emptyLedger(): Ledger {
  return new Ledger([]);
}
