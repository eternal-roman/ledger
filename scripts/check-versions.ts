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
  { file: 'mcp/server.json', extract: (s) => JSON.parse(s).version, note: 'server.json top version' },
  { file: 'mcp/server.json', extract: (s) => JSON.parse(s).packages?.[0]?.version ?? null, note: 'server.json packages[0].version' },
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

try {
  const server = JSON.parse(readFileSync('mcp/server.json', 'utf8'));
  const mcpPkg = JSON.parse(readFileSync('mcp/package.json', 'utf8'));
  if (mcpPkg.mcpName !== server.name) {
    allGood = false;
    mismatches.push(`mcp/package.json mcpName "${mcpPkg.mcpName}" !== mcp/server.json name "${server.name}"`);
  }
  const desc = typeof server.description === 'string' ? server.description : '';
  if (desc.length < 1 || desc.length > 100) {
    allGood = false;
    mismatches.push(`mcp/server.json description length ${desc.length} (registry maxLength 100)`);
  }
} catch (e) {
  allGood = false;
  mismatches.push(`mcp registry fields: ${(e as Error).message}`);
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
