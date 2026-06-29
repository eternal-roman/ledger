import { describe, it, expect } from 'vitest';
import {
  Money, Account, AccountType, createBalancedEntry, emptyLedger,
} from '../../src/index.js';
import { reconcilePositions } from '../../src/reconcile/reconcile.js';

const cash = new Account('1000', 'Cash', AccountType.Asset);
const equity = new Account('3000', 'Owner Equity', AccountType.Equity);
const eurCash = new Account('1001', 'EUR Cash', AccountType.Asset);

function fund(amt: string, cur = 'USD', acct = cash, id = 'f1') {
  return createBalancedEntry(id, '2026-06-01', acct, equity, Money.from(amt, cur), 'Fund');
}

describe('Position reconciliation', () => {
  it('matches when ledger equals external (to the minor unit)', () => {
    const l = emptyLedger().apply(fund('1000.00')).ledger;
    const r = reconcilePositions(l, [
      { accountCode: '1000', amount: '1000.00', currency: 'USD' },
      { accountCode: '3000', amount: '1000.00', currency: 'USD' },
    ]);
    expect(r.reconciled).toBe(true);
    expect(r.discrepancies).toBe(0);
    expect(r.rows.every(row => row.status === 'matched')).toBe(true);
  });

  it('flags an exact mismatch with a signed diff', () => {
    const l = emptyLedger().apply(fund('1000.00')).ledger;
    const r = reconcilePositions(l, [
      { accountCode: '1000', amount: '999.99', currency: 'USD' },
    ]);
    const row = r.rows.find(x => x.accountCode === '1000')!;
    expect(row.status).toBe('mismatch');
    expect(row.diff).toBe('0.01 USD'); // ledger 1000.00 - external 999.99
    expect(r.reconciled).toBe(false);
  });

  it('flags missing_in_external and missing_in_ledger', () => {
    const l = emptyLedger().apply(fund('500.00')).ledger;
    const r = reconcilePositions(l, [
      { accountCode: '9999', amount: '5.00', currency: 'USD' }, // not in ledger
    ]);
    const byCode = Object.fromEntries(r.rows.map(x => [x.accountCode + '|' + x.currency, x.status]));
    expect(byCode['9999|USD']).toBe('missing_in_ledger');
    expect(byCode['1000|USD']).toBe('missing_in_external');
    expect(byCode['3000|USD']).toBe('missing_in_external');
  });

  it('reconciles multi-currency leg-by-leg', () => {
    let l = emptyLedger();
    l = l.apply(fund('1000.00', 'USD', cash, 'u')).ledger;
    l = l.apply(fund('800.00', 'EUR', eurCash, 'e')).ledger;
    const r = reconcilePositions(l, [
      { accountCode: '1000', amount: '1000.00', currency: 'USD' },
      { accountCode: '1001', amount: '800.00', currency: 'EUR' },
      { accountCode: '3000', amount: '1000.00', currency: 'USD' },
      { accountCode: '3000', amount: '800.00', currency: 'EUR' },
    ]);
    expect(r.reconciled).toBe(true);
  });

  it('rejects a sub-scale external amount (fails closed via Money.from)', () => {
    const l = emptyLedger().apply(fund('1000.00')).ledger;
    expect(() => reconcilePositions(l, [
      { accountCode: '1000', amount: '1000.001', currency: 'USD' },
    ])).toThrow();
  });
});
