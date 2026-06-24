import { createRequire } from 'node:module';

export * from './core/index.js';
export * from './knowledge/index.js';
export * from './rules/index.js';
export * from './verify/index.js';
export * from './verify/scanner.js';

// Investing & financial-services layer (all expressed through the kernel):
// asset registry, trading/custody postings, portfolio cost-basis & valuation,
// investment math (returns, allocation, rebalancing), and crypto transfers (one-shot/two-phase in-transit + network fees).
export * from './instruments/index.js';
export * from './trading/index.js';
export * from './portfolio/index.js';
export * from './investing/index.js';
export * from './crypto/index.js';

// Kernel (Money, Account, JournalEntry, Ledger) + recognition rules, a small
// IFRS/GAAP citation graph, and the verify harness.
//
// Single source of truth for the version, with no hardcoded drift and no
// `import.meta` in the CJS bundle: the build (tsup `define`) injects
// __LEDGER_VERSION__ from package.json; when that define is absent (dev/tsx),
// we fall back to reading package.json at runtime. esbuild constant-folds the
// injected branch so the import.meta path is dead-code-eliminated in CJS.
declare const __LEDGER_VERSION__: string;
function resolveVersion(): string {
  if (typeof __LEDGER_VERSION__ === 'string') return __LEDGER_VERSION__;
  const pkg = createRequire(import.meta.url)('../package.json') as { version: string };
  return pkg.version;
}
export const VERSION: string = resolveVersion();
export const DESCRIPTION =
  'Execution as Proof for money — the deterministic correctness layer AI agents call. ' +
  'Exact decimal arithmetic, kernel-enforced double-entry, immutable audit-hashed ledgers, ' +
  'deterministic and reproducible. Provably cannot emit unbalanced or float-based entries.';
