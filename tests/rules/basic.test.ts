import { describe, it, expect } from 'vitest';
import { Money, Account, AccountType, createBalancedEntry } from '../../src/core/index.js';
import { validateAssetRecognition } from '../../src/rules/index.js';

const cash = new Account('100', 'Cash', AccountType.Asset);
const equity = new Account('300', 'Equity', AccountType.Equity);

describe('Basic Rules (IFRS stub + citations)', () => {
  it('validates asset entry with citation', () => {
    const entry = createBalancedEntry('test', '2026-06-21', cash, equity, Money.from(100, 'USD'), 'Buy asset');
    const res = validateAssetRecognition(entry);
    expect(res.ok).toBe(true);
    expect(res.citations.length).toBeGreaterThan(0);
  });
});
