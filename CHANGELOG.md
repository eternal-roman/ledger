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

### Added (0.5.0)
- Persistence (JSON roundtrips for entries/ledger/accounts/CoA preserving hashes/eq).
- ChartOfAccounts (immutable registry + opening balances via kernel).
- Time/measurement M0: periods, annuity PV, amortization schedules (kernel-validated).
- prepublishOnly + verified packaging.
- CFA compliance for new features.

### Fixed / Changed
- `isISODate` centralised; schedule rounding fixed; 83 tests green.

Historical details (0.4.x and earlier kernel work) are in git history. Internal plan removed; current state in this file, AGENTS.md, and tests.