import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...tsFiles(p));
    else if (name.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('no floats in the monetary core', () => {
  // Match actual calls, not the word in prose/comments, so we guard real usage.
  const callsParse = (src: string) => /\bparse(Float|Int)\s*\(/.test(src);

  it('src/ makes no parseFloat/parseInt calls (forbidden for monetary values)', () => {
    const offenders = tsFiles('src').filter(f => callsParse(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
