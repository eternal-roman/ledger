import { describe, it, expect } from 'vitest';
import {
  Money,
  Account,
  AccountType,
  createBalancedEntry,
  emptyLedger,
} from '../../src/index.js';
import { generateClosingEntries, createRetainedEarningsAccount } from '../../src/closing/closing.js';

const cash = new Account('1000', 'Cash', AccountType.Asset);
const revenue = new Account('4000', 'Revenue', AccountType.Income);
const rent = new Account('5000', 'Rent Expense', AccountType.Expense);
const re = createRetainedEarningsAccount();

describe('Closing engine (retained earnings)', () => {
  it('generateClosingEntries produces balanced entries that zero temp accounts', () => {
    let l = emptyLedger();
    // Revenue credit 5000
    l = l.apply(createBalancedEntry('rev', '2026-06-01', cash, revenue, Money.from('5000', 'USD'), 'Sales')).ledger;
    // Expense debit 2000
    l = l.apply(createBalancedEntry('exp', '2026-06-02', rent, cash, Money.from('2000', 'USD'), 'Rent')).ledger;

    const closes = generateClosingEntries(l, '2026-06-30', re);
    expect(closes.length).toBeGreaterThan(0);

    let post = l;
    for (const c of closes) {
      const r = post.apply(c);
      expect(r.result.ok).toBe(true);
      post = r.ledger;
    }

    // After close, the minimal income view should show zero net for the closed amounts
    // (the pre-close net was 3000; RE increased by that)
    expect(post.verifyFundamentalEquation()).toBe(true);

    // Revenue account should be zeroed
    expect(post.balance(revenue).isZero()).toBe(true);
    // RE increased by net 3000
    const reBals = post.balancesByCurrency(re);
    expect(reBals.some(b => b.toString() === '3000.00 USD')).toBe(true);
  });

  it('multi-currency close keeps per-curr equation', () => {
    const revEur = new Account('4100', 'Revenue EUR', AccountType.Income);
    let l = emptyLedger();
    l = l.apply(createBalancedEntry('r1', '2026-06-01', cash, revEur, Money.from('1000', 'EUR'), 'EU sales')).ledger;

    const closes = generateClosingEntries(l, '2026-06-30', re);
    let post = l;
    for (const c of closes) post = post.apply(c).ledger;

    expect(post.verifyFundamentalEquation()).toBe(true);
  });
});
