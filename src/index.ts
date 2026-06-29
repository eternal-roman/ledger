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

// Accounting standards built on the kernel. IFRS 16 (Leases) — lessee — is the
// first fully-tested standard (golden-master verified to the cent).
export * from './standards/ifrs16/index.js';

// Period governance (hard close / anti-fraud), closing engine, FX translation + CTA,
// and general depreciation/amortization schedules. All built on the kernel primitives
// with the same golden-master, determinism, and equation guarantees.
export * from './periods/lock.js';
export * from './closing/closing.js';
export * from './fx/translation.js';
export * from './standards/depreciation/index.js';

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
  'Exact-decimal Money and double-entry primitives for TypeScript. ' +
  'Enforces balanced, non-float entries via validateEntry and immutable Ledger.apply. ' +
  'Includes audit hash, determinism checks and verification tools.';
