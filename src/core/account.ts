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
}
