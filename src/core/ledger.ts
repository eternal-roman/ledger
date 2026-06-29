import { createHash } from 'node:crypto';
import { JournalEntry, JournalEntryLine, validateEntry, ValidationResult, SerializedJournalEntry } from './journal.js';
import { Money } from './money.js';
import { Account, AccountType } from './account.js';

export interface LedgerSnapshot {
  readonly entries: readonly JournalEntry[];
  readonly asOf: string;
}

export interface SerializedLedger {
  v: string;
  entries: SerializedJournalEntry[];
}

/** Canonical, key-order-independent serialization of a tag map for hashing. */
function stableTags(tags: Record<string, string> | undefined): string {
  if (!tags) return 'null';
  const keys = Object.keys(tags).sort();
  return JSON.stringify(keys.map((k) => [k, tags[k]]));
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
    if (this._entries.some(e => e.id === entry.id)) {
      return {
        ledger: this,
        result: { ok: false, violations: [{ type: 'DUPLICATE_ID', message: `Entry ID "${entry.id}" already exists in this ledger` }] }
      };
    }
    // Account identity is a ledger-level invariant: a code may not be redefined
    // with a different type or name across entries (type drives the normal-balance
    // side, so a silent redefinition would corrupt every balance and the equation).
    const known = new Map<string, { type: string; name: string }>();
    for (const e of this._entries) {
      for (const l of e.lines) {
        if (!known.has(l.account.code)) known.set(l.account.code, { type: l.account.type, name: l.account.name });
      }
    }
    for (const l of entry.lines) {
      const prev = known.get(l.account.code);
      if (prev && (prev.type !== l.account.type || prev.name !== l.account.name)) {
        return {
          ledger: this,
          result: { ok: false, violations: [{ type: 'ACCOUNT_REDEFINED', message: `Account code ${l.account.code} already defined as ${prev.type}/${prev.name}; cannot redefine as ${l.account.type}/${l.account.name}` }] },
        };
      }
    }
    const newEntries = [...this._entries, entry];
    return {
      ledger: new Ledger(newEntries),
      result
    };
  }

  /** Lines posted to an account, optionally as of a date. */
  private accountLines(account: Account, asOf?: string): JournalEntryLine[] {
    const relevant = this._entries.filter(e => !asOf || e.effectiveDate <= asOf);
    return relevant.flatMap(e => e.lines.filter(l => l.account.code === account.code));
  }

  /** Distinct currencies present in a set of lines, in first-seen order. */
  private currenciesOf(lines: readonly JournalEntryLine[]): string[] {
    const seen: string[] = [];
    for (const l of lines) if (!seen.includes(l.amount.currency)) seen.push(l.amount.currency);
    return seen;
  }

  /** Net of an account within a single currency, per its normal balance. */
  private netInCurrency(account: Account, lines: readonly JournalEntryLine[], currency: string): Money {
    let debit = Money.zero(currency);
    let credit = Money.zero(currency);
    for (const line of lines) {
      if (line.amount.currency !== currency) continue;
      if (line.side === 'debit') debit = debit.add(line.amount);
      else credit = credit.add(line.amount);
    }
    return account.normalBalance === 'debit' ? debit.sub(credit) : credit.sub(debit);
  }

  /** One net balance per currency the account has touched (empty account -> []). */
  balancesByCurrency(account: Account, asOf?: string): Money[] {
    const lines = this.accountLines(account, asOf);
    return this.currenciesOf(lines).map(c => this.netInCurrency(account, lines, c));
  }

  /**
   * Net balance for account (asOf optional). For accounts with activity in more than one
   * currency you MUST pass `currency`; otherwise this fails closed rather than silently
   * dropping a currency. Use `balancesByCurrency` to get all currencies at once.
   */
  balance(account: Account, asOf?: string, currency?: string): Money {
    const lines = this.accountLines(account, asOf);
    if (currency) return this.netInCurrency(account, lines, currency);

    const currencies = this.currenciesOf(lines);
    if (currencies.length === 0) {
      // No activity: fall back to a currency present in the ledger, else USD.
      return Money.zero(this._entries[0]?.lines[0]?.amount.currency || this.pickCurrency('USD'));
    }
    if (currencies.length > 1) {
      throw new Error(
        `Account ${account.code} has multiple currencies (${currencies.join(', ')}); ` +
        `pass an explicit currency or use balancesByCurrency()`
      );
    }
    return this.netInCurrency(account, lines, currencies[0]);
  }

  /**
   * Verify Assets + Expenses = Liabilities + Equity + Income (per currency).
   * Discovers accounts if not supplied.
   */
  verifyFundamentalEquation(accounts?: Account[]): boolean {
    const accts = accounts && accounts.length > 0 ? accounts : this.discoverAccounts();

    // Per-currency sides to support mixed-currency ledgers exactly. Every currency an
    // account touches is counted (not just the first), so nothing is silently ignored.
    const byCurr: Map<string, { debit: Money; credit: Money }> = new Map();

    for (const acct of accts) {
      const isDebitNormal = acct.type === AccountType.Asset || acct.type === AccountType.Expense;
      for (const bal of this.balancesByCurrency(acct)) {
        const c = bal.currency;
        if (!byCurr.has(c)) byCurr.set(c, { debit: Money.zero(c), credit: Money.zero(c) });
        const s = byCurr.get(c)!;
        if (isDebitNormal) s.debit = s.debit.add(bal);
        else s.credit = s.credit.add(bal);
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

  /** All accounts that appear in the ledger, de-duplicated by code (first-seen). */
  private discoverAccounts(): Account[] {
    const seen = new Map<string, Account>();
    for (const e of this._entries) {
      for (const l of e.lines) {
        if (!seen.has(l.account.code)) seen.set(l.account.code, l.account);
      }
    }
    return Array.from(seen.values());
  }

  /**
   * Trial balance: discovered accounts + their current net balances.
   * Useful for reports and AI-assisted verification of full set.
   */
  trialBalance(): Array<{ account: Account; balance: Money }> {
    const rows: Array<{ account: Account; balance: Money }> = [];
    for (const account of this.discoverAccounts()) {
      // One row per currency so multi-currency accounts are reported in full.
      for (const balance of this.balancesByCurrency(account)) {
        rows.push({ account, balance });
      }
    }
    return rows;
  }

  /**
   * Summarize net position by AccountType (aids equation checks and reporting).
   * Note: within-currency only for simplicity (multi-curr ledgers group per curr in verify).
   */
  summarizeByType(): Array<{ type: AccountType; total: Money }> {
    // Group by (type, currency) so totals are currency-complete rather than dropping
    // any currency that differs from the first one seen for a type.
    const groups = new Map<string, { type: AccountType; total: Money }>();
    for (const { account, balance } of this.trialBalance()) {
      const key = `${account.type}|${balance.currency}`;
      const g = groups.get(key);
      if (!g) groups.set(key, { type: account.type, total: balance });
      else g.total = g.total.add(balance);
    }
    return Array.from(groups.values());
  }

  /** Capture current immutable snapshot (useful for audit / reporting). */
  snapshot(asOf: string): LedgerSnapshot {
    return { entries: this.entries, asOf };
  }

  /** Deterministic serialization for persistence. Roundtrips preserve auditHash + equation. */
  toJSON(): SerializedLedger {
    return {
      v: '1',
      entries: this._entries.map(e => e.toJSON()),
    };
  }

  /** Reconstruct immutable Ledger from serialized form. Each entry validated on reconstruction. */
  static fromJSON(j: any): Ledger {
    if (!j || j.v !== '1' || !Array.isArray(j.entries)) {
      throw new Error('Ledger.fromJSON: invalid or unsupported shape');
    }
    const entries = j.entries.map((e: any) => JournalEntry.fromJSON(e));
    return new Ledger(entries);
  }

  /** Stable SHA-256 audit hash (tamper-evident chain over all entries/fields). */
  auditHash(): string {
    // Tamper-evident SHA-256 chain (format v2). Every field is individually
    // length-prefixed (`${f.length}:${f}`), so differing field *content* and
    // differing line *counts* both yield distinct token streams — two entries
    // cannot collide by regrouping lines (locked by ledger.test.ts).
    //
    // v2 (breaking vs v1): each line now hashes the account *type* and *name* in
    // addition to its code. Type drives the normal-balance side and therefore the
    // meaning of every balance and the fundamental equation; name is the human
    // identity. Omitting them (v1) left the hash blind to a type flip or a rename.
    // Tags are canonicalized by sorted key so key order never affects the digest.
    let chain = createHash('sha256').update('ledger-audit-v2').digest('hex');
    for (const e of this._entries) {
      const fields: string[] = [e.id, e.effectiveDate, e.description];
      for (const l of e.lines) {
        fields.push(
          l.side,
          l.account.code,
          l.account.type,
          l.account.name,
          l.amount.toHashable(),
          stableTags(l.tags),
        );
      }
      fields.push(stableTags(e.tags), JSON.stringify(e.citations ?? null));
      const h = createHash('sha256').update(chain);
      for (const f of fields) h.update(`${f.length}:${f}`);
      chain = h.digest('hex');
    }
    return chain;
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
    const pick = (t: AccountType) =>
      sums.find(s => s.type === t && s.total.currency === curr)?.total ?? Money.zero(curr);
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
    const get = (t: AccountType) =>
      sums.find(s => s.type === t && s.total.currency === curr)?.total ?? Money.zero(curr);
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
