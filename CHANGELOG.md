# Changelog

## [Unreleased]

### Added / Changed (dev experience + plugin integration)
- Switched to bash-first hooks for Claude Code / compatible hosts: extensionless `hooks/ledger-activate` + polyglot `run-hook.cmd` wrapper (modeled on superpowers patterns for cross-platform Git Bash support on Windows). Eliminates pwsh friction for hooks and agent commands.
- New `/ledger-review` command + `skills/ledger-review` (orchestrates ledger invariants + superpowers verification + pr-review-toolkit agents + security-guidance).
- Full project customization for recommended plugins (superpowers, pr-review-toolkit, skill-creator, plugin-dev, claude-md-management, security-guidance, hookify, commit-commands, etc.):
  - `.claude/settings.json` (scoped permissions).
  - `.claude/agents/bean-counter-reviewer.md`.
  - Project-scoped plugin installs.
  - Enhanced `skills/ledger/*` with plugin integration notes + references/.
  - Updated `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/claude-plugins.md`, `hooks/README.md`.
- Added `hooks/` to published package files (so activation hooks ship for consumers using ledger as a Claude plugin via `.claude-plugin/`).
- `.claude-plugin/` manifest + marketplace entry for using the repo as plugin source.
- Consistent documentation of the integrated "Bean Counter + plugins" workflow.

## [0.5.0] - 2026-06-22

### Added (gap closure on docs/ifrs-15-16-engine-scope per commercial plan + assessment)
- **Persistence (gap #1 closed)**: `JournalEntry.toJSON/fromJSON`, `Ledger.toJSON/fromJSON`, `ChartOfAccounts.toJSON/fromJSON`, `Account.toJSON/fromJSON`. Deterministic roundtrips preserve `auditHash`, `verifyFundamentalEquation`, balances, and immutability.
- **CoA management (gap #2 minimally)**: `ChartOfAccounts` (pure immutable registry, dedup by code, list/get/add, opening balances workflow via kernel entries).
- **Periods + IFRS engine start (gaps #3,#5)**: `src/time` (M0: `isISODate`, `Period`, `periods(start,end,freq)`, `presentValueOfAnnuity`, `periodRate`); `src/standards/measure` (`Schedule`, `buildAmortizationSchedule`, `computePV`). Schedules emit kernel-validated entries. Golden PV test + full kernel proof (validate + apply + equation).
- **Publish (gap #8)**: `prepublishOnly` runs `clean && verify:full`; packaging verified via `npm pack` (dist + persona + examples ship clean).
- M0 satisfies CFA: citations (IFRS 16.26/36), exact Money, determinism, kernel plan executed.

### Fixed / Changed
- Centralised `isISODate` in time/; journal re-exports for compat.
- Schedule lines round to currency scale before entry creation (SUB_SCALE guard).
- 83 tests; verify:full green.

See CHANGELOG history and kernel tests for gap status (internal commercial plan removed for lean public repo).

### Fixed (repository audit — guarantees now match the code) (landed prior to 0.5.0; no separate 0.4.4 tag was cut)
- **Tamper-evident audit trail**: `Ledger.auditHash()` is now a SHA-256 hash chain over every
  material field (account code, effective date, description, line side/amount/tags, entry
  tags/citations) with length-prefixed fields. Previously it ignored account, date, and memo,
  so a redirected/back-dated/re-memoed entry hashed identically.
- **FX exactness**: `FXRate` stores rates exactly (decimal string, no `parseFloat`/float);
  `Money.convert` multiplies exactly and rounds to the target currency scale.
- **No silent floats**: `Money.from` rejects non-integer JS numbers (use strings for fractions).
- **Multi-currency safety**: added `Ledger.balancesByCurrency`; `balance()` now fails closed on a
  multi-currency account instead of silently dropping a currency; `trialBalance`/`summarizeByType`/
  `verifyFundamentalEquation`/income+balance-sheet are currency-complete.
- **Real recognition rules**: revenue must credit Income, expense must debit Expense, leases need
  both a ROU Asset and a lease Liability, valuations require a citation, named liabilities must be
  Liability-typed — with negative tests. (Previously the rules only re-checked balance.)
- **Stronger kernel validation**: `validateEntry` rejects sub-currency-scale amounts and non-ISO
  effective dates; FX legs can be rate-checked via `createFxConversion(..., rate)`.
- **Determinism check** actually compares two runs via audit hash (and returns the hash).
- **Knowledge graph**: whole-word/id-token matching (no more "tax" matching "syntax"; fixed an
  `OR`-split bug that shattered words like "inventory"); results ranked by confidence; added the
  missing `Definition` node type and replaced masking `as` casts with `satisfies`.
- **Deep immutability**: journal line and entry tags are frozen.
- **Tooling**: `typecheck` now covers scripts/tests/examples; version is read from `package.json`
  (no drift); a guard test forbids `parseFloat`/`parseInt` in `src/`; CI runs a single `verify:full`.

## [0.4.3] - 2026-06-21

### Added / Changed
- Kernel complete: exact Money (div/allocate/compare/negate/abs/JSON/provenance/convert via FX), JournalEntry tags/citations, Ledger (snapshot/audit/replay/trialBalance/equation).
- Basic CFA validator + Zero-Skip Output Contract.
- GAAP + IFRS knowledge seeds + graph levers.
- 53+ tests + determinism harness; verify:full green.
- Persona enforcement script (check:persona), CI on feature/fix branches.
- ISSUE_TEMPLATE for canon gaps + invariant violations.
- Cleanup: dedup fixes, bloat reduction, docs sharpen.

Roadmap details were in the (now removed) internal commercial-grade plan. Current status is reflected in this changelog, AGENTS.md, and tests.

## [0.3.1] - Previous
- Money negate/abs/JSON + polish.