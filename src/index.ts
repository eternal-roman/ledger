import { createRequire } from 'node:module';

export * from './core/index.js';
export * from './knowledge/index.js';
export * from './rules/index.js';
export * from './verify/index.js';

// Investing & financial-services layer (all expressed through the kernel):
// asset registry, trading/custody postings, portfolio cost-basis & valuation,
// investment math (returns, allocation, rebalancing), and crypto exchange (CEX) ops.
export * from './instruments/index.js';
export * from './trading/index.js';
export * from './portfolio/index.js';
export * from './investing/index.js';
export * from './crypto/index.js';

// Kernel (Money, Account, JournalEntry, Ledger) + recognition rules, a small
// IFRS/GAAP citation graph, and the verify harness.
// Single source of truth: the version is read from package.json (no hardcoded drift).
const pkg = createRequire(import.meta.url)('../package.json') as { version: string };
export const VERSION: string = pkg.version;
export const DESCRIPTION = 'Ledger — The Bean Counter (Uncompromising Financial Architect). Exact Money arithmetic, double-entry, validated ledgers and canon citations. Mistakes do not ship.';
