# Changelog

## [0.14.0] - 2026-06-24

**Installable for real, in both module systems.**

- **Renamed the npm package to `@eternal-roman/ledger`** — a claimable scoped name.
  `npm install @eternal-roman/ledger` now works directly (the previous unscoped
  `ledger` name belonged to an unrelated package, forcing tarball/git workarounds).
- **Dual ESM + CommonJS build** via `tsup`: `import` and `require` both resolve,
  each with matching `.d.ts` / `.d.cts` type declarations. The prior "ESM-only,
  use dynamic import from CJS" caveat is gone.
- Version is injected at build time (no `import.meta` in the CJS bundle) so the
  single source of truth stays `package.json` with no hardcoded drift.
- Self-referencing imports, examples, the `ledger-verify` CLI, and docs updated to
  the scoped name. Determinism harness + all 112 tests still green.

## [0.13.0] - 2026-06-23

- docs: align README to v0.13.0 + full plan verification completion (gap fixes landed).
- Versions aligned across all 7 locations.

## [0.12.0] - 2026-06-23

- docs: align README to current v0.12.0 (plan verification gap fix + release alignment).
- Versions aligned across all 7 locations after plan verification completion (package.json + lock + plugins + pyproject + __init__.py + CHANGELOG).

## [0.11.0] - 2026-06-23

- docs: update README package version references to v0.11.0 (plan verification gap fix + release alignment).
- Versions aligned across all 7: package.json, package-lock (both), plugin.json, .claude-plugin/plugin.json, CHANGELOG, pyproject.toml, ledger/__init__.py (ref).

## [0.10.0] - 2026-06-23

- improve: make packaged examples runnable post-install via dynamic loader; add --prove stdin support; adoption DX follow-ups + hygiene.
- All 14 plan verifs, verify:full, check-work, and post-pack adoption tests green.
- Versions aligned across package.json, package-lock.json (both), plugin.json, .claude-plugin/plugin.json, CHANGELOG.md, reference-implementations/python/pyproject.toml, reference-implementations/python/ledger/__init__.py.

## [0.9.0] - 2026-06-23
- Release prep following adoption plan completion and DX improvements (CLI, scanner, docs accuracy).
- Versions aligned across package.json, package-lock.json, plugin.json, .claude-plugin/plugin.json, CHANGELOG.md, reference-implementations/python/pyproject.toml, reference-implementations/python/ledger/__init__.py.
- All verifs green.

## [0.8.0] - 2026-06-23
- Full ledger skills remediation & adoption plan (standalone tooling, surfaces, citations, guards, dogfooding, scope, duplication, persona/coupling/honesty). All 14 verification commands + check-work PASS. Kernel invariants preserved.
- Versions aligned across package.json, package-lock.json (top + root), plugin.json, .claude-plugin/plugin.json, CHANGELOG.md, reference-implementations/python/pyproject.toml, reference-implementations/python/ledger/__init__.py .
- Merged via clean PR #39 off main. Minor bump.
- Details:
  - Standalone `scripts/ledger-verify.ts` + `bin/ledger-verify.cjs` + `npm run verify:ledger` (mechanical scanner + real runTrace / makeCanonicalArtifact prove path).
  - Reusable `src/verify/scanner.ts` (exported) + refactored no-floats-guard + dedicated scanner tests.
  - Adoption surfaces: QUICKSTART-SKILLS, SUCCESS-CHECKLIST, ANTI-PATTERNS, EXAMPLE-LEDGER-VERIFY-OUTPUT.md, cursor adapter, adapters/README.
  - SCOPE-AND-LAYERS.md + CITATION-COVERAGE.md + CORE-PROTOCOL.md.
  - Neutral `skills/ledger-core/SKILL.md`.
  - Reduced host-plugin coupling language and commands honesty notes.
  - Dogfood demo (`examples/kernel-proof-demo.ts`).
  - All new paths exercised by plan verification commands; verify:full green.

## [Unreleased / next]

## [0.7.7] - 2026-06-23
- Patch release: Python reference parity + version alignment.
  - Python ref `Money` now serializes `scale` (`to_json`/`from_json`), mirroring the TS v0.7.6 fix so both kernels roundtrip asset amounts at the correct scale without the global resolver (added `test_from_json_restores_explicit_asset_scale`).
  - Synced `reference-implementations/python/pyproject.toml` to the current version (was lagging at 0.7.5); all version surfaces now aligned at 0.7.7.
  - TS `verify:full` green (106 tests); Python ref suite green (10 tests).

## [0.7.6] - 2026-06-23
- Cleanup release: removed self-confirming "enforcement" theater; kept the real kernel + persona voice.
  - Removed the `check:persona` CI gate and `scripts/check-persona-consistency.ts` — builds no longer fail on marketing strings (Ledger Chad persona voice retained in docs).
  - Deleted `ledger/audit_artifacts/` and `LEDGER_ENFORCEMENT_PLAN.md` (padded, self-confirming "proof" apparatus; real verification lives in `tests/`).
  - Removed stray release tarballs/signatures from the working tree (already gitignored).
  - Fixed: `Money` now serializes `scale` (`toJSON`/`fromJSON`), so asset amounts (e.g. 8-dp crypto) roundtrip exactly even when the global scale resolver is not installed.
  - Documented and regression-locked the `auditHash` length-prefix framing (no hash format change; `ledger-audit-v1` retained).
  - `verify:full` is now build + typecheck + test + verify (no persona step); 106 tests green.

## [0.7.5] - 2026-06-23
- Patch release: ledger enforcement iteration complete.
  - Ported minimal lots.py (build_lots, relief_for, realized_pnl) to Python reference canonical.
  - 13 self-contained runnable scripts in ledger/audit_artifacts/ (all 10 lifecycles + adversarial, precision, cross-harness).
  - Automated py<->TS cross verification harness.
  - Updated trading helpers, tests, exports, README.
  - Full LEDGER_ENFORCEMENT_PLAN.md with verification block (PASS), meta_findings.md.
  - 794+ kernel ops, 12+ numeric counterexamples with P&L/decision impact.
  - All via core primitives (Money.from, validateEntry, Ledger.apply, runTrace, CFAs). No floats. Double-entry enforced.
  - TS + py tests + verify:full + persona green.
- Versions aligned to 0.7.5 across package.json, package-lock.json, plugin.json, .claude-plugin/plugin.json, Python ref.

## [0.7.4] - 2026-06-22
- Grok-native plugin support: root `plugin.json`, `hooks/hooks.json` (GROK_PLUGIN_ROOT + node activation via ledger-activate.js).
- Cross-platform hook activation (pwsh/Grok no longer requires Git Bash for the echo banner; bash path retained for Claude).
- Made `/ledger-review` (and supporting skills) gracefully degrade: always run full ledger invariants; note "Ledger layer only" when superpowers/pr-review-toolkit (or host equivalents) are not present. Updated AGENTS.md, commands, references/plugin-integration.md.
- Documentation: prominent Grok install (`grok plugin install ... --trust`), library consumption instructions, multi-host notes in README and docs/.
- Packaging: added `plugin.json` to "files", version alignment (0.7.3 across package.json, plugin.json, .claude-plugin/plugin.json, package-lock.json), persona checker now covers Grok manifest + hooks/hooks.json.
- **ledger-audit strengthening (kernel-grounded)**: Rewrote audit to require modeling monetary flows with actual kernel primitives (Money.from, JournalEntry/validateEntry, Ledger.apply or runTrace, CanonicalFinancialArtifact proofs). Removed hype branding and completed plans. Added runTrace in verify for transaction tracing. Shipped Python reference canonical (core + trading helpers) for cross-lang audits. Added inventory scanner helper. All tests, build, typecheck, determinism pass.
- **Ledger enforcement iteration complete** (feat/ledger-enforcement-iteration): Ported minimal lots.py (build_lots, relief_for, realized_pnl using custody tags + Money) to Python ref for FIFO/LIFO. Added 13 self-contained runnable audit scripts under ledger/audit_artifacts/ covering all 10 target lifecycles + adversarial/precision + grid vs main + cross harness. Full LEDGER_ENFORCEMENT_PLAN.md verification block + meta_findings.md. 794+ kernel ops exercised, 12+ numeric impact counterexamples. Cross-verification (eq/bal behavioral), run_trace + CFA everywhere. TS + py tests + verify:full + persona green. Float guard enforced (fixed stray float(fee) in trading helpers). Double-entry invariants + no native floats throughout.
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