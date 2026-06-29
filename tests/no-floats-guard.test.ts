import { describe, it, expect } from 'vitest';
import { scanDir, scanSourceForViolations } from '../src/verify/scanner.js';

describe('ledger mechanical scanner (no floats / money anti-patterns)', () => {
  it('src/core and src/verify contain zero high-severity money violations (kernel heart)', () => {
    const vios = [...scanDir('src/core'), ...scanDir('src/verify')];
    const severe = vios.filter(v => ['PARSE_FLOAT', 'FLOAT_LITERAL', 'DIRECT_ARITHMETIC'].includes(v.type));
    if (severe.length > 0) {
      console.error(severe);
    }
    expect(severe).toEqual([]);
  });

  it('scanner correctly flags a synthetic parseFloat + float literal', () => {
    const bad = 'const f = parseFloat("1.2"); const t = 100.50 + 0.01;';
    const direct = scanSourceForViolations(bad, 'bad.ts');
    expect(direct.some((d: any) => d.type === 'PARSE_FLOAT')).toBe(true);
    expect(direct.some((d: any) => d.type === 'FLOAT_LITERAL')).toBe(true);
    expect(direct[0].suggestion).toMatch(/Money\.from/);
  });
});
