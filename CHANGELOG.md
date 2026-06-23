# Changelog

## [0.7.3] - Unreleased
- Grok-native plugin support: root `plugin.json`, `hooks/hooks.json` (GROK_PLUGIN_ROOT + node activation via ledger-activate.js).
- Cross-platform hook activation (pwsh/Grok no longer requires Git Bash for the echo banner; bash path retained for Claude).
- Made `/ledger-review` (and supporting skills) gracefully degrade: always run full ledger invariants; note "Ledger layer only" when superpowers/pr-review-toolkit (or host equivalents) are not present. Updated AGENTS.md, commands, references/plugin-integration.md.
- Documentation: prominent Grok install (`grok plugin install ... --trust`), library consumption instructions, multi-host notes in README and docs/.
- Packaging: added `plugin.json` to "files", version alignment (0.7.3 across package.json, plugin.json, .claude-plugin/plugin.json, package-lock.json), persona checker now covers Grok manifest + hooks/hooks.json.
- **ledger-audit strengthening (kernel-grounded)**: Rewrote audit to require modeling monetary flows with actual kernel primitives (Money.from, JournalEntry/validateEntry, Ledger.apply or runTrace, CanonicalFinancialArtifact proofs). Removed hype branding and completed plans. Added runTrace in verify for transaction tracing. Shipped Python reference canonical (core + trading helpers) for cross-lang audits. Added inventory scanner helper. All tests, build, typecheck, determinism pass.
- No changes to kernel or tests. All existing Claude surfaces preserved.

## [0.7.2] - 2026-06-23

- ponytail patch: remove YAGNI ChartOfAccounts (unused outside tests/comments), consolidate dupe ROUND_HALF_UP into core export, delete empty speculative standards/ dirs.
- net -72 lines. Follows delete/yagni/stdlib/shrink.
- kernel + AI primitives (Account, Money, JournalEntry, Ledger) unaffected.

## [0.7.1] - 2026-06-22

- Cleaned up old dangling remote branches (claude/*, docs/*, feat/*, feature/*, fix/*, patch/*, review/*, refine/* etc. from history).
- Removed release artifacts (*.tgz, *.sig) from root.
- Included ledger-chad-banner.jpg in README with proper scaling for full asset utilization (resolves previous dangling).
- Verified all documents (README, AGENTS, etc.) contain only real functionality and benefits; no fantasy or overreaching claims. Persona and meme elements preserved and grounded in actual kernel behavior.
- All previous image improvements (background removal, proportional scaling) integrated.

## [0.7.0] - 2026-06-22
- Hardened `check:persona`: split CORE_REQUIRED from BRAND_PHRASES; pointer adapters + short manifests/docs now require only core+key Chad phrases (prevents sync fragility and cascade red merges on branding changes).
- Expanded surfaces: now covers CLAUDE.md, .claude-plugin/*.json, .claude/agents/*, hooks/README.md, README (phrases + graphics).
- Added graphic/asset consistency enforcement (no stale bean-counter in active files) and package/manifest alignment checks.
- Fixed remaining Prod gaps from rushed prior merges: updated plugin.json + marketplace (Chad + v0.6.1), CLAUDE.md, agent (renamed + Chad text), .kiro + copilot adapters (image to ledger-chad.jpg), package keywords, review skill/cmd.
- CI: `fail-fast: false` in matrix for complete reporting.
- Release skill: mandatory pre-merge `pull_request_read:get_check_runs` + local `verify:full` gate; explicit forbid on red PRs; ties to subagents.
- All persona surfaces now pass check; no mixed branding or version skews.

## [0.6.1] - 2026-06-21

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