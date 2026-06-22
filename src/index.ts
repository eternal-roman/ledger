import { createRequire } from 'node:module';

export * from './core/index.js';
export * from './knowledge/index.js';
export * from './rules/index.js';
export * from './verify/index.js';

// Full verify harness, rules, knowledge integrated.
// Single source of truth: the version is read from package.json (no hardcoded drift).
const pkg = createRequire(import.meta.url)('../package.json') as { version: string };
export const VERSION: string = pkg.version;
export const DESCRIPTION = 'Ledger — The Bean Counter (Uncompromising Financial Architect). Exact Money arithmetic, double-entry, validated ledgers and canon citations. Mistakes do not ship.';
