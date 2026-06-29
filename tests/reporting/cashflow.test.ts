import { describe, it, expect } from 'vitest';
import {
  Money, Account, AccountType, createBalancedEntry, emptyLedger,
} from '../../src/index.js';
import { cashFlowStatement, isCashByConvention } from '../../src/reporting/cashflow.js';

// Convention cash account: code starts with CASH.
const cash = new Account('CASH:MAIN:USD', 'Operating Cash', AccountType.Asset);
const revenue = new Account('4000', 'Revenue', AccountType.Income);
const rent = new Account('5000', 'Rent Expense', AccountType.Expense);
const equip = new Account('1500', 'Equipment', AccountType.Asset);
const loan = new Account('2000', 'Bank Loan', AccountType.Liability);
const equity = new Account('3000', 'Owner Equity', AccountType.Equity);

function post(l: any, entry: any) { const r = l.apply(entry); expect(r.result.ok).toBe(true); return r.ledger; }

describe('Cash flow statement (direct method)', () => {
  it('classifies operating, investing, financing and reconciles', () => {
    let l = emptyLedger();
    // Financing: owner injects 10,000
    l = post(l, createBalancedEntry('f1', '2026-06-01', cash, equity, Money.from('10000.00', 'USD'), 'Capital'));
    // Financing: bank loan 5,000
    l = post(l, createBalancedEntry('f2', '2026-06-02', cash, loan, Money.from('5000.00', 'USD'), 'Loan'));
    // Investing: buy equipment for 4,000 cash
    l = post(l, createBalancedEntry('i1', '2026-06-03', equip, cash, Money.from('4000.00', 'USD'), 'Equipment'));
    // Operating: receive revenue 3,000
    l = post(l, createBalancedEntry('o1', '2026-06-04', cash, revenue, Money.from('3000.00', 'USD'), 'Sales'));
    // Operating: pay rent 1,000
    l = post(l, createBalancedEntry('o2', '2026-06-05', rent, cash, Money.from('1000.00', 'USD'), 'Rent'));

    const [s] = cashFlowStatement(l);
    expect(s.currency).toBe('USD');
    expect(s.financing).toBe('15000.00 USD');   // 10000 + 5000
    expect(s.investing).toBe('-4000.00 USD');   // equipment out
    expect(s.operating).toBe('2000.00 USD');    // 3000 - 1000
    expect(s.netChange).toBe('13000.00 USD');
    expect(s.openingCash).toBe('0.00 USD');
    expect(s.closingCash).toBe('13000.00 USD');
    expect(s.reconciled).toBe(true);
  });

  it('respects an explicit period window with opening cash carried in', () => {
    let l = emptyLedger();
    l = post(l, createBalancedEntry('p1', '2026-05-31', cash, equity, Money.from('1000.00', 'USD'), 'Prior capital'));
    l = post(l, createBalancedEntry('p2', '2026-06-10', cash, revenue, Money.from('500.00', 'USD'), 'June sales'));

    const [s] = cashFlowStatement(l, { start: '2026-06-01', end: '2026-06-30' });
    expect(s.openingCash).toBe('1000.00 USD'); // pre-period balance
    expect(s.operating).toBe('500.00 USD');
    expect(s.financing).toBe('0.00 USD');      // capital was before the window
    expect(s.netChange).toBe('500.00 USD');
    expect(s.closingCash).toBe('1500.00 USD');
    expect(s.reconciled).toBe(true);
  });

  it('treats cash-to-cash moves as no net flow', () => {
    const cash2 = new Account('CASH:SAVINGS:USD', 'Savings', AccountType.Asset);
    let l = emptyLedger();
    l = post(l, createBalancedEntry('c1', '2026-06-01', cash, equity, Money.from('100.00', 'USD'), 'Capital'));
    l = post(l, createBalancedEntry('c2', '2026-06-02', cash2, cash, Money.from('40.00', 'USD'), 'Move to savings'));
    const [s] = cashFlowStatement(l);
    // Net change across both cash accounts is just the 100 financing inflow.
    expect(s.financing).toBe('100.00 USD');
    expect(s.operating).toBe('0.00 USD');
    expect(s.investing).toBe('0.00 USD');
    expect(s.reconciled).toBe(true);
  });

  it('isCashByConvention recognises CASH codes and cash-named accounts only for assets', () => {
    expect(isCashByConvention(cash)).toBe(true);
    expect(isCashByConvention(new Account('1010', 'Petty cash', AccountType.Asset))).toBe(true);
    expect(isCashByConvention(loan)).toBe(false);
    expect(isCashByConvention(new Account('2100', 'Cash loan payable', AccountType.Liability))).toBe(false);
  });

  it('rejects an inverted period window', () => {
    expect(() => cashFlowStatement(emptyLedger(), { start: '2026-06-30', end: '2026-06-01' })).toThrow();
  });
});
