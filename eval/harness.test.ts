import { describe, it, expect } from 'vitest';
import { runBenchmark } from './harness.js';
import { fixtureProposer } from './proposers.js';

describe('benchmark harness', () => {
  const result = runBenchmark(fixtureProposer());

  it('baseline commits invariant violations to the books', () => {
    expect(result.baseline.violationsReachingBooks).toBeGreaterThan(0);
    expect(result.baseline.finalBalanced).toBe(false);
  });

  it('guarded run lets zero violations reach the books (by construction)', () => {
    expect(result.guarded.violationsReachingBooks).toBe(0);
    expect(result.guarded.rejectedByGuardrail).toBe(result.baseline.violationsReachingBooks);
  });

  it('guarded ledger is balanced, audit-hashed, and deterministic', () => {
    expect(result.guarded.finalBalanced).toBe(true);
    expect(result.guarded.auditHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.guarded.deterministic).toBe(true);
  });
});
