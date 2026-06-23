import { describe, it, expect } from 'vitest';
import { scanSourceForViolations } from '../../src/verify/scanner.js';

describe('verify/scanner', () => {
  it('flags parseFloat', () => {
    const v = scanSourceForViolations('const x = parseFloat("1");', 't.ts');
    expect(v.some(vv => vv.type === 'PARSE_FLOAT')).toBe(true);
  });

  it('flags float literal in money context', () => {
    const v = scanSourceForViolations('const amt = 123.45;', 't.ts');
    expect(v.some(vv => vv.type === 'FLOAT_LITERAL')).toBe(true);
  });

  it('suggests Money.from', () => {
    const v = scanSourceForViolations('const f=0.01;', 't.ts');
    expect(v[0].suggestion).toMatch(/Money\.from/);
  });

  it('returns clean on good kernel usage', () => {
    const good = 'import {Money} from "ledger"; const m = Money.from("10.00", "USD");';
    expect(scanSourceForViolations(good, 'good.ts').length).toBe(0);
  });

  it('flags direct arithmetic hint', () => {
    const v = scanSourceForViolations('const risk = risk * 0.02;', 't.ts');
    expect(v.some(vv => vv.type === 'DIRECT_ARITHMETIC')).toBe(true);
  });
});
