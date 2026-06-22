import { describe, it, expect } from 'vitest';
import { Money } from '../../src/core/money.js';
import { timeWeightedReturn, moneyWeightedReturn } from '../../src/investing/index.js';

describe('time-weighted return', () => {
  it('chains sub-period returns, neutralizing flows', () => {
    // Period 1: 100 -> 110 (no flow) = +10%. Period 2: begins 110, +50 flow, ends 176 -> 176/160 = +10%.
    const twr = timeWeightedReturn([
      { begin: Money.from('100', 'USD'), end: Money.from('110', 'USD'), flow: Money.from('0', 'USD') },
      { begin: Money.from('110', 'USD'), end: Money.from('176', 'USD'), flow: Money.from('50', 'USD') },
    ]);
    // (1.1 * 1.1) - 1 = 0.21
    expect(twr).toBe('0.21');
  });
});

describe('money-weighted return (IRR)', () => {
  it('solves a simple one-year doubling-free case', () => {
    // -100 now, +110 in one year => IRR = 10%
    const r = moneyWeightedReturn([
      { date: '2025-06-22', amount: Money.from('-100', 'USD') },
      { date: '2026-06-22', amount: Money.from('110', 'USD') },
    ]);
    expect(r.converged).toBe(true);
    expect(Number(r.irr)).toBeCloseTo(0.1, 6);
  });

  it('solves a multi-flow series deterministically', () => {
    const flows = [
      { date: '2024-01-01', amount: Money.from('-1000', 'USD') },
      { date: '2024-07-01', amount: Money.from('-500', 'USD') },
      { date: '2025-01-01', amount: Money.from('1650', 'USD') },
    ];
    const a = moneyWeightedReturn(flows);
    const b = moneyWeightedReturn(flows);
    expect(a.converged).toBe(true);
    expect(a.irr).toBe(b.irr); // deterministic
  });

  it('flags non-convergence (all-positive flows have no IRR root) instead of guessing', () => {
    const r = moneyWeightedReturn([
      { date: '2025-01-01', amount: Money.from('100', 'USD') },
      { date: '2026-01-01', amount: Money.from('100', 'USD') },
    ]);
    expect(r.converged).toBe(false);
  });
});
