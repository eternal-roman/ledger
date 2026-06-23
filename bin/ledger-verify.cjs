#!/usr/bin/env node
/**
 * Thin wrapper so "ledger-verify" bin works after install.
 * Prefers tsx on the TypeScript source (dev + published scripts).
 * Falls back with exact instruction.
 * Mirrors the style and robustness of hooks/ledger-activate.js.
 */
const cp = require('child_process');
const p = require('path');

const script = p.join(__dirname, '..', 'scripts', 'ledger-verify.ts');

try {
  // tsx may be hoisted or direct
  require.resolve('tsx');
  cp.execSync(`npx tsx "${script}" ${process.argv.slice(2).join(' ')}`, { stdio: 'inherit' });
  process.exit(0);
} catch (e) {
  console.error('ledger-verify: tsx not found in environment.');
  console.error('Run instead: npx tsx node_modules/ledger/scripts/ledger-verify.ts ' + process.argv.slice(2).join(' '));
  process.exit(1);
}
