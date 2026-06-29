import { describe, it, expect } from 'vitest';
import { Money, Account, AccountType, createBalancedEntry } from '../../src/core/index.js';
import { validateAssetRecognition, validateLiabilityRecognition, validateValuation, validateRevenueRecognition, validateExpenseRecognition, validateLeaseRecognition } from '../../src/rules/index.js';

const cash = new Account('100', 'Cash', AccountType.Asset);
const equity = new Account('300', 'Equity', AccountType.Equity);
const deposits = new Account('200', 'Customer Deposits', AccountType.Liability);

describe('Basic Rules (IFRS stub + citations)', () => {
  it('validates asset entry with citation', () => {
    const entry = createBalancedEntry('test', '2026-06-21', cash, equity, Money.from('100', 'USD'), 'Buy asset');
    const res = validateAssetRecognition(entry);
    expect(res.ok).toBe(true);
    expect(res.citations.length).toBeGreaterThan(0);
  });

  it('validates liability with citations and kernel', () => {
    const entry = createBalancedEntry('dep', '2026-06-21', cash, deposits, Money.from('5000', 'USD'), 'Customer deposit');
    const res = validateLiabilityRecognition(entry);
    expect(res.ok).toBe(true);
    expect(res.citations.length).toBeGreaterThan(0);
  });

  it('provides valuation citations for measurement entries', () => {
    const entry = createBalancedEntry('val', '2026-06-21', cash, equity, Money.from('10000', 'USD'), 'Valuation', ['valuation-multiple-distinction']);
    const res = validateValuation(entry);
    expect(res.ok).toBe(true);
    expect(res.citations.length).toBeGreaterThan(0);
  });

  it('validates revenue entry with IFRS15 citations', () => {
    const income = new Account('400', 'Sales Revenue', AccountType.Income);
    const entry = createBalancedEntry('rev', '2026-06-21', cash, income, Money.from('2500', 'USD'), 'Recognize revenue from sale');
    const res = validateRevenueRecognition(entry);
    expect(res.ok).toBe(true);
    expect(res.citations.length).toBeGreaterThan(0);
  });

  it('validates expense entry with accrual citations', () => {
    const rent = new Account('500', 'Rent Expense', AccountType.Expense);
    const entry = createBalancedEntry('exp', '2026-06-21', rent, cash, Money.from('1200', 'USD'), 'Accrue rent expense');
    const res = validateExpenseRecognition(entry);
    expect(res.ok).toBe(true);
    expect(res.citations.length).toBeGreaterThan(0);
  });

  it('validates lease recognition pulls IFRS16 citations and kernel', () => {
    const rou = new Account('150', 'Right-of-Use Asset', AccountType.Asset);
    const leaseLiab = new Account('250', 'Lease Liability', AccountType.Liability);
    const entry = createBalancedEntry('lease1', '2026-06-21', rou, leaseLiab, Money.from('5000', 'USD'), 'Initial recognition of lease ROU + liability');
    const res = validateLeaseRecognition(entry);
    expect(res.ok).toBe(true);
    expect(res.citations.length).toBeGreaterThan(0);
    expect(res.citations.some(c => /ifrs-16|lease/i.test(c))).toBe(true);
  });

  // Anti-theater: each rule must reject entries that violate the structural signature of
  // its transaction type, not merely re-check double-entry balance.
  it('rejects a "revenue" entry that credits no Income account', () => {
    const entry = createBalancedEntry('rev-bad', '2026-06-21', cash, equity, Money.from('100', 'USD'), 'Recognize revenue from sale');
    expect(validateRevenueRecognition(entry).ok).toBe(false);
  });

  it('rejects an "expense" entry that debits no Expense account', () => {
    const entry = createBalancedEntry('exp-bad', '2026-06-21', cash, equity, Money.from('100', 'USD'), 'Accrue an expense');
    expect(validateExpenseRecognition(entry).ok).toBe(false);
  });

  it('rejects a lease entry missing either the ROU asset or the lease liability', () => {
    const rou = new Account('150', 'Right-of-Use Asset', AccountType.Asset);
    const otherAsset = new Account('151', 'Other Asset', AccountType.Asset);
    const entry = createBalancedEntry('lease-bad', '2026-06-21', rou, otherAsset, Money.from('5000', 'USD'), 'Initial lease recognition');
    expect(validateLeaseRecognition(entry).ok).toBe(false); // Asset present but no Liability
  });

  it('rejects a valuation entry that carries no citation', () => {
    const entry = createBalancedEntry('val-bad', '2026-06-21', cash, equity, Money.from('100', 'USD'), 'Mark to model');
    expect(validateValuation(entry).ok).toBe(false);
  });

  it('rejects a named-asset line posted to a non-Asset account', () => {
    const fakeCash = new Account('900', 'Cash Clearing', AccountType.Liability); // "cash" but Liability-typed
    const entry = createBalancedEntry('asset-bad', '2026-06-21', equity, fakeCash, Money.from('100', 'USD'), 'Buy asset');
    expect(validateAssetRecognition(entry).ok).toBe(false);
  });
});
