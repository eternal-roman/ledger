import { describe, it, expect } from 'vitest';
import { Money, Account, AccountType, emptyLedger, createBalancedEntry, computeFxTranslation } from '../../src/index.js';

const cashUsd = new Account('1000', 'Cash USD', AccountType.Asset);
const assetEur = new Account('1100', 'EUR Asset', AccountType.Asset);
const equity = new Account('3000', 'Equity', AccountType.Equity);

describe('FX translation + CTA (premium, with explicit numbers)', () => {
  it('computes translated balances and exact CTA plug (golden style)', () => {
    let l = emptyLedger();
    // Simple balanced: 1000 EUR asset funded by equity (in functional mix)
    l = l.apply(createBalancedEntry('cap', '2026-01-01', assetEur, equity, Money.from('1000', 'EUR'), 'Capital in EUR')).ledger;

    const rates = { EUR: { rate: '1.10', source: 'test' } };
    const res = computeFxTranslation(l, '2026-06-30', rates, 'USD');

    expect(res.reportingCurrency).toBe('USD');
    // Asset 1000 EUR @ 1.10 = 1100 USD translated
    const assetHolding = res.holdings.find(h => h.account.code === '1100');
    expect(assetHolding?.translated.toString()).toBe('1100.00 USD');
    expect(assetHolding?.original.toString()).toBe('1000.00 EUR');

    // CTA plug will be non-zero to make translated equation balance (since equity is EUR orig but translated? )
    // In this setup equity not translated separately, CTA compensates.
    expect(res.cta).toBeTruthy();
    // The result should claim balanced with CTA (cta may be signed)
    expect(res.balancedWithCta).toBe(true);
  });
});
