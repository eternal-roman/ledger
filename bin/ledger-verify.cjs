#!/usr/bin/env node
/**
 * Thin wrapper so "ledger-verify" bin works after install (tarball, git, npm).
 * Always uses npx tsx (fetches on demand if needed) on the TS source script.
 * This makes the CLI fully functional for end users without tsx as a runtime dep.
 */
const cp = require('child_process');
const p = require('path');

const script = p.join(__dirname, '..', 'scripts', 'ledger-verify.ts');

try {
  cp.execSync(`npx tsx "${script}" ${process.argv.slice(2).join(' ')}`, { stdio: 'inherit' });
  process.exit(0);
} catch (e) {
  // Forward the child's exit code (e.g. 1 for violations) without extra noise
  if (e && typeof e.status === 'number') {
    process.exit(e.status);
  }
  console.error('ledger-verify: failed to run via npx tsx.');
  console.error('Ensure npx is available, or run directly: npx tsx node_modules/ledger/scripts/ledger-verify.ts ' + process.argv.slice(2).join(' '));
  process.exit(1);
}
