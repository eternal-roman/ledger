import { describe, it, expect } from 'vitest';
import { Money } from '../../src/core/money.js';

describe('Money - exact arithmetic (no floats ever)', () => {
  it('0.1 + 0.2 === 0.3 exactly in USD', () => {
    const a = Money.from('0.1', 'USD');
    const b = Money.from('0.2', 'USD');
    const sum = a.add(b);
    expect(sum.toString()).toBe('0.30 USD');
    expect(sum.toDecimal().toString()).toBe('0.3');
  });

  it('rejects currency mismatch on add', () => {
    const usd = Money.from('10', 'USD');
    const eur = Money.from('10', 'EUR');
    expect(() => usd.add(eur)).toThrow(/currency/i);
  });

  it('is immutable', () => {
    const m1 = Money.from('5.00', 'USD');
    const m2 = m1.add(Money.from('1', 'USD'));
    expect(m1.toString()).toBe('5.00 USD');
    expect(m2.toString()).toBe('6.00 USD');
    // Different instances
    expect(m1).not.toBe(m2);
  });

  it('supports asOf and provenance (for determinism + trace)', () => {
    const m = Money.from('100', 'USD', '2026-06-21');
    expect(m.asOf).toBe('2026-06-21');
  });

  it('from number is converted exactly via string path', () => {
    // Protect against accidental float
    const m = Money.from(0.1, 'USD');
    expect(m.toString()).toMatch(/^0\.1/);
  });
});
