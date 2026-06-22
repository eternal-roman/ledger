export enum AccountType {
  Asset = 'Asset',
  Liability = 'Liability',
  Equity = 'Equity',
  Income = 'Income',
  Expense = 'Expense',
}

export class Account {
  constructor(
    public readonly code: string,
    public readonly name: string,
    public readonly type: AccountType,
    public readonly normalBalance: 'debit' | 'credit' = type === AccountType.Asset || type === AccountType.Expense ? 'debit' : 'credit'
  ) {}

  toString(): string {
    return `${this.code} ${this.name} (${this.type})`;
  }

  /** Serialize for persistence / roundtrip (pairs with fromJSON). */
  toJSON(): { code: string; name: string; type: AccountType } {
    return { code: this.code, name: this.name, type: this.type };
  }

  /** Reconstruct from serialized form. Derives normalBalance from type. */
  static fromJSON(j: any): Account {
    if (!j || typeof j !== 'object' || !j.code || !j.name || !j.type) {
      throw new Error('Account.fromJSON: invalid account shape');
    }
    return new Account(j.code, j.name, j.type as AccountType);
  }
}

/**
 * Managed Chart of Accounts (pure, immutable).
 * Closes ad-hoc gap: accounts registered, deduped by code, queryable.
 * Opening balances are applied as regular kernel JournalEntries (capital/equity plugs).
 */
export class ChartOfAccounts {
  private readonly _accounts: readonly Account[];

  constructor(accounts: Account[] = []) {
    const seen = new Map<string, Account>();
    for (const a of accounts) {
      if (seen.has(a.code)) {
        throw new Error(`Duplicate account code in ChartOfAccounts: ${a.code}`);
      }
      seen.set(a.code, a);
    }
    this._accounts = Object.freeze([...accounts]);
  }

  /** All accounts (insertion order). */
  list(): readonly Account[] {
    return this._accounts;
  }

  get(code: string): Account | undefined {
    return this._accounts.find(a => a.code === code);
  }

  /** Pure: returns new chart with added account. */
  add(acct: Account): ChartOfAccounts {
    if (this.get(acct.code)) {
      throw new Error(`Account ${acct.code} already exists`);
    }
    return new ChartOfAccounts([...this._accounts, acct]);
  }

  /** Serialize for roundtrip. */
  toJSON(): { v: string; accounts: ReturnType<Account['toJSON']>[] } {
    return { v: '1', accounts: this._accounts.map(a => a.toJSON()) };
  }

  static fromJSON(j: any): ChartOfAccounts {
    if (!j || j.v !== '1' || !Array.isArray(j.accounts)) throw new Error('ChartOfAccounts.fromJSON invalid');
    return new ChartOfAccounts(j.accounts.map((a: any) => Account.fromJSON(a)));
  }
}
