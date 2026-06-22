# Changelog

## [0.7.0] - 2026-06-21

### Added / Changed (repo hygiene + plugin)
- Cleanup: removed internal planning doc, design specs, release artifacts, risky `.claude/settings.json`.
- Kept IDE adapter files + ADAPTERS list (helpful for persona enforcement).
- `.gitignore` hardened against bloat.
- verify:full and persona checks maintained.
- Continued plugin customization.

### Added / Changed (dev experience + plugin integration)
- Switched to bash-first hooks for Claude Code / compatible hosts: extensionless `hooks/ledger-activate` + polyglot `run-hook.cmd` wrapper (modeled on superpowers patterns for cross-platform Git Bash support on Windows). Eliminates pwsh friction for hooks and agent commands.
- New `/ledger-review` command + `skills/ledger-review` (orchestrates ledger invariants + superpowers verification + pr-review-toolkit agents + security-guidance).
- Project customization for recommended plugins (superpowers, pr-review-toolkit, etc.): scoped `.claude/settings.json`, agent reviewer, plugin installs, enhanced skills/commands, updated docs.
- `hooks/` added to published files for plugin consumers (via `.claude-plugin/` manifest).
- Consistent "Bean Counter + plugins" workflow docs.

## [0.5.0] - 2026-06-22

### Added (gap closure on docs/ifrs-15-16-engine-scope per commercial plan + assessment)
- **Persistence (gap #1 closed)**: `JournalEntry.toJSON/fromJSON`, `Ledger.toJSON/fromJSON`, `ChartOfAccounts.toJSON/fromJSON`, `Account.toJSON/fromJSON`. Deterministic roundtrips preserve `auditHash`, `verifyFundamentalEquation`, balances, and immutability.
- **CoA management (gap #2 minimally)**: `ChartOfAccounts` (pure immutable registry, dedup by code, list/get/add, opening balances workflow via kernel entries).
- **Periods + IFRS engine start (gaps #3,#5)**: `src/time` (M0: `isISODate`, `Period`, `periods(start,end,freq)`, `presentValueOfAnnuity`, `periodRate`); `src/standards/measure` (`Schedule`, `buildAmortizationSchedule`, `computePV`). Schedules emit kernel-validated entries. Golden PV test + full kernel proof (validate + apply + equation).
- **Publish (gap #8)**: `prepublishOnly` runs `clean && verify:full`; packaging verified via `npm pack` (dist + persona + examples ship clean).
- M0 satisfies CFA: citations (IFRS 16.26/36), exact Money, determinism, kernel plan executed.

### Fixed / Changed
- `isISODate` centralised; schedule rounding fixed; 83 tests green.

Historical details (0.4.x and earlier kernel work) are in git history. Internal plan removed; current state in this file, AGENTS.md, and tests.