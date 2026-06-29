#!/usr/bin/env tsx
/**
 * Kernel version alignment gate (MANDATORY for verify:full + /release).
 * Reads ALL manifests FIRST (per pwsh-guard + release skill), compares to package.json.
 * Enforces no skews across root + mcp + plugins + python ref + changelog.
 * Run: npm run check:versions
 * Exit 0 only if perfect alignment.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const rootPkg = JSON.parse(readFileSync('package.json', 'utf8'));
const expected = rootPkg.version;

const locations: Array<{ file: string; extract: (s: string) => string | null; note?: string }> = [
  { file: 'package.json', extract: (s) => JSON.parse(s).version },
  { file: 'package-lock.json', extract: (s) => { const j=JSON.parse(s); return j.version || j.packages?.['']?.version; } },
  { file: 'plugin.json', extract: (s) => JSON.parse(s).version },
  { file: '.claude-plugin/plugin.json', extract: (s) => JSON.parse(s).version },
  { file: 'mcp/package.json', extract: (s) => JSON.parse(s).version },
  { file: 'mcp/server.json', extract: (s) => { const j=JSON.parse(s); return j.version || j.packages?.[0]?.version; }, note: 'server manifest + package entry' },
  { file: 'CHANGELOG.md', extract: (s) => { const m = s.match(/^\s*##\s*\[([^\]]+)\]/m); return m ? m[1] : null; } },
  { file: 'reference-implementations/python/pyproject.toml', extract: (s) => { const m = s.match(/^\s*version\s*=\s*"([^"]+)"/m); return m ? m[1] : null; } },
  { file: 'reference-implementations/python/ledger/__init__.py', extract: (s) => { const m = s.match(/^\s*__version__\s*=\s*"([^"]+)"/m); return m ? m[1].replace(/-ref$/, '') : null; }, note: 'strips -ref for compare; source is X.Y.Z-ref' },
];

let allGood = true;
const mismatches: string[] = [];

for (const loc of locations) {
  try {
    const content = readFileSync(loc.file, 'utf8');
    const got = loc.extract(content);
    if (got !== expected) {
      allGood = false;
      mismatches.push(`${loc.file}: got "${got}" expected "${expected}" ${loc.note ? '('+loc.note+')' : ''}`);
    }
  } catch (e) {
    allGood = false;
    mismatches.push(`${loc.file}: read/extract failed - ${(e as Error).message}`);
  }
}

if (allGood) {
  console.log(`check:versions OK — all locations aligned to ${expected}`);
  process.exit(0);
} else {
  console.error('check:versions FAILED — version skews detected:');
  mismatches.forEach(m => console.error('  ' + m));
  console.error('\nFix all manifests to match package.json version before commit/release.');
  process.exit(1);
}
