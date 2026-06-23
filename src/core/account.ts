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

