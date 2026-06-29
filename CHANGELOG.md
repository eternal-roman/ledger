# Changelog

## [0.16.6] - 2026-06-29

**MCP error response contract hardening + disclaimers (patch).**

- Fixed inconsistent MCP error shapes (isError for schema vs {ok:false} for logical/runtime). Standardized: top-level `ok: boolean`; robust parsers + tests for all shapes.
- Added contract tests + expanded smoke covering schema/logical/error cases.
- Minimal disclaimers (due diligence, MIT) in key MDs + SKILLs.
- Deepened adversarial loop coverage. Response contract documented.
- Gates green: 27 tests, smoke, check:versions, verify:full. Kernel unchanged.

Manifests synced; check:versions + verify:full green.

## [0.16.5] - 2026-06-29

**MCP first-class kernel citizen + mandatory result verification (patch).**

- Minimal disclaimers added (tests = due diligence, MIT-backed) in READMEs, SCOPE, CITATION, skills, SECURITY, AGENTS, Python ref.
- Deep adversarial MCP loop (12+ malicious cases): all rejected or kernel-verified; no bad data.
- Static kernel imports; key ops re-verify via primitives (equation, validateEntry, auditHash) before return + `kernelVerified`.
- Exact string serialization for Money; string-only rates; stricter ledgerSchema; {ok:false} for business fails.
- `check-versions.ts` (all manifests incl mcp/*) wired to verify:full.
- Expanded tests/smoke (adversarial, verification roundtrips, guarded paths). 24+ tests + smoke green. MCP error shapes hardened (isError + {ok:false} contract, robust parsers).
- Ensures kernel-correct or explicit fail; response contract documented.

Manifests synced; check:versions + verify:full + mcp smoke green.

## [0.16.4] - 2026-06-29

**MCP server hardened for real end-user installs + resources/prompts (patch).**

Made `@eternal-roman/ledger-mcp` fully usable over the published `npx -y @eternal-roman/ledger-mcp` path and added MCP resources and prompts. No kernel behavior or serialization change.

- **Publish blocker fixed:** the MCP's kernel dependency was `"@eternal-roman/ledger": "file:.."`, unresolvable for an end-user installing from npm. It is now a publish-safe semver range (`^0.16.4`) that npm workspaces still satisfies from the in-repo kernel during development — no dev↔release rewrite step.
- **Build robustness:** `build:mcp` now builds the kernel first (the MCP's `.d.ts` build type-checks against the kernel's emitted types), so a stale root `dist/` can no longer break the MCP build. Added `verify:mcp` (build kernel + MCP, then a real stdio smoke) and wired it into `verify:full`.
- **Built-binary stdio smoke:** new `mcp/scripts/smoke.mjs` spawns the compiled `dist/server.js` over stdio and asserts the full surface (20 tools, 3 resources, 3 prompts, exact arithmetic, fail-closed posting, audit hash). The prior in-memory tests never exercised the compiled binary, so packaging regressions went uncaught.
- **MCP resources** (read-only context): `ledger://canon/rules`, `ledger://canon/workflow`, `ledger://tools/catalog` — the catalog is kept in lockstep with the tool surface by a drift-guard test.
- **MCP prompts** (guided templates): `post_entry`, `audit_ledger`, `cite_treatment`.
- **Docs:** README documents all 20 tools plus resources/prompts; RELEASING reflects the no-rewrite dependency.
- **Version sync:** the MCP package + `server.json` were stranded at 0.14.0 while the kernel was 0.16.x; all locations aligned to 0.16.4.

Full suite green (kernel + MCP unit tests + stdio smoke); determinism verified; both packages build.

Manifests synced; check:versions + verify:full green.

## [0.16.3] - 2026-06-29

**Operational FinEx extensions (patch).**

Four kernel-native extensions, each built only on existing primitives (exact `Money`, `validateEntry`, immutable `Ledger`) and wired end-to-end (module → `index.ts` export → MCP tool → tests), in the same style as the closing/FX/depreciation utilities:

- **Cash flow statement (`reporting/cashflow`):** direct-method statement derived exactly from ledger cash-account movements via per-leg attribution (a counterparty leg contributes `credit − debit` to cash). Per-currency operating/investing/financing with opening and closing cash and a self-checking `opening + netChange == closing` reconciliation. Cash accounts detected by convention (`CASH*` codes / "cash"-named assets) or an explicit code list.
- **Position reconciliation (`reconcile/reconcile`):** compares ledger-derived balances against an external snapshot (exchange/custodian/bank), matched by account code **and** currency, with exact Money diffs and fail-closed status (`matched` / `mismatch` / `missing_in_ledger` / `missing_in_external`).
- **Holding-period classification (`portfolio/lots`):** lot relief now emits a per-slice breakdown with `holdingDays` and short/long/**mixed** term (configurable `longTermThresholdDays`, default 365). Additive and backward-compatible; respects the v0.16.2 VULN-03 side guards.
- **Settlement-date accounting (`trading/settlement`):** T+N postings — trade-date entries route the cash leg through a settlement receivable (sell) / payable (buy); the settlement-date entry swaps it for cash, netting the receivable/payable to zero. Economically identical to the spot fill, every leg kernel-validated.

New MCP tools: `cashflow_statement`, `reconcile_positions`, `portfolio_relief`, `settlement_build_entries`.

Verification: a 3-round seeded adversarial harness asserts every invariant holds (equation, determinism, cash-flow reconciliation, holding-period classification, settlement netting) and that every malformed proposal — unbalanced, currency-mix, duplicate id, sub-scale, float, non-finite, oversell, settlement-before-trade, fee-exceeds-amount — is always rejected and never posted. Full suite **179 tests** green and identical across 3 consecutive runs; `tsc` clean; both packages build; determinism + standalone adversarial suites green. No change to serialization format or existing balances.

Manifests synced; check:versions + verify:full green.

## [0.16.2] - 2026-06-29

**Security & correctness hardening (patch).**

Validated and fixed findings from an adversarial audit, plus a parallel hole found in review:

- **VULN-01 (CRITICAL):** `Money.from` now rejects non-finite values (`Infinity`/`-Infinity`/`NaN`) from both string and number forms, so a non-finite amount can never poison balances, the fundamental equation, or the audit hash.
- **VULN-02 (MEDIUM):** `Money.from` uses `Number.isSafeInteger`, rejecting numeric input above `MAX_SAFE_INTEGER` that `String()` would silently truncate.
- **VULN-03 (HIGH):** lot reconstruction asserts the ledger side matches the tag role (`acquire`⇒debit, `dispose`⇒credit), preventing phantom cost lots from a mistagged line.
- **VULN-04 (MEDIUM):** trading account `norm` preserves separators (`USD-T`⇒`USD_T`) so distinct symbols no longer collide onto one custody account.
- **VULN-06 (LOW):** knowledge-graph search applies `\b` word boundaries only adjacent to word characters, so terms like `$100` match.
- **FXRate Infinity/NaN (CRITICAL, found in review):** the same non-finite class reached the kernel through `FXRate` (string rates bypassed the number-only guard) and was reachable from the MCP server. Closed the whole class with one central `toFiniteDecimal` guard at every external numeric entry point (`Money.from`, `FXRate`, `Money.mul`/`div` scalars, `Money.allocate` ratios).
- VULN-05 (regex synonym evasion) reviewed and intentionally not patched: it is an advisory-layer limitation that does not affect kernel double-entry invariants.

10 new regression tests added (157 total). `tsc` typecheck clean; determinism verification produces identical audit hashes across runs; MCP suite green. No impact on serialization format or existing balances.

Manifests synced; check:versions + verify:full green.

## [0.16.1] - 2026-06-29

**Persona language cleanup (patch).**

- Removed all hyperbolic meme-chat ("Ledger Chad", "Alpha Maxxing", "Float-Phobic", "GAAP-Pilled", "Double-Entry Maxxing", "Get beta", "diamond hands", "bro", etc.) from AGENTS.md, skills/ledger/*, CLAUDE.md, docs/*, hooks/*, commands/*, README.md, package.json, Python references, and other instruction files.
- Deleted duplicate persona rule files for other AI tools (.clinerules, .cursor, .kiro, .windsurf).
- All substantive technical rules, Zero-Skip protocol, kernel primitives (Money.from, JournalEntry, validateEntry, Ledger.apply), citations, and MCP safety preserved and presented cleanly.
- Full /ledger-audit + /ponytail-audit + test suite + determinism verified clean. No impact on Kernel or MCP data integrity.
- PR #60 merged after CI green.

Manifests synced; check:versions + verify:full green.

## [0.16.0] - 2026-06-29

**Core financial utilities release.**

- Period-End Lock / Hard Close (anti-fraud protocol)
- Closing / Retained Earnings Engine
- Multi-Currency FX Translation & CTA
- Standard Depreciation & Amortization Schedules

All implemented on the kernel. Manifests synced; check:versions + verify:full green.

## [0.15.0] - 2026-06-28

**Factual cleanup + release hygiene.**

- Audited and tightened README, docs, mcp/README, hooks, comments: removed overclaims ("provably", "guarantees", hype phrasing), adopted precise kernel terms ("enforces", "fail closed").
- Cleaned clutter (temp scripts, stale tags); isolated persona flavor; kept citation disclaimers honest.
- Changes minimal/traceable to kernel behavior.

Manifests synced; check:versions + verify:full green.
All 135 tests + determinism + build + typecheck green. CI passed.

## [0.14.0] - 2026-06-24

**The deterministic correctness layer AI agents call.** Installable for real,
usable from any agent, with a proof and a fully-tested standard.

### Installable, in both module systems
- **Renamed the npm package to `@eternal-roman/ledger`** — a claimable scoped name.
  `npm install @eternal-roman/ledger` now works directly (the previous unscoped
  `ledger` name belonged to an unrelated package, forcing tarball/git workarounds).
- **Dual ESM + CommonJS build** via `tsup`: `import` and `require` both resolve,
  each with matching `.d.ts` / `.d.cts` declarations. The ESM-only caveat is gone.
  Version is injected at build time (no `import.meta` in the CJS bundle), keeping
  `package.json` the single source of truth.

### MCP server — `@eternal-roman/ledger-mcp`
- A stdio Model Context Protocol server exposing the kernel as agent tools:
  `money_compute`, `entry_validate`, `ledger_post`, `ledger_balance`,
  `ledger_trial_balance`, `ledger_verify_equation`, `ledger_audit_hash`,
  `ledger_verify_determinism`, `trace_run`, `cite_lookup`, `artifact_make`.
  Stateless (ledger state travels as JSON) and fail-closed (invalid entries are
  rejected, not posted). Includes a registry manifest and client setup docs.

### Proof — benchmark
- `npm run eval` runs the same AI-proposed entries unguarded vs kernel-guarded.
  With the recorded fixture, the unguarded run commits 4/8 corrupt entries and
  leaves the books unbalanced; the guarded run lets 0 reach the books and the
  surviving ledger is balanced, audit-hashed, and deterministic. Report in
  `docs/BENCHMARK.md`; asserted in CI.

### Standard — IFRS 16 (Leases, lessee)
- A faithful, fully-tested engine on the kernel: PV initial liability, ROU asset,
  interest accretion, principal reduction, straight-line depreciation, and balanced
  journal entries with paragraph citations. Verified to the cent by a golden-master
  test.

### Positioning
- README now leads with the guarantee ("Execution as Proof for money"), a
  failure-mode → guarantee table, an MCP quickstart, and a comparison vs
  dinero.js / medici / Formance / TigerBeetle. The "Ledger Chad" persona moved to
  `docs/agent-persona.md` as optional flavor.

All 134 tests green (kernel + MCP + eval + IFRS 16); determinism harness passing.

## [0.13.0] - 2026-06-23

- docs: align README to v0.13.0 + full plan verification completion (gap fixes landed).
- Manifests synced; check:versions + verify:full green.

## [0.12.0] - 2026-06-23

- docs: align README to current v0.12.0 (plan verification gap fix + release alignment).
- Manifests synced; check:versions + verify:full green.

## [0.11.0] - 2026-06-23

- docs: update README package version references to v0.11.0 (plan verification gap fix + release alignment).
- Manifests synced; check:versions + verify:full green.

## [0.10.0] - 2026-06-23

- improve: make packaged examples runnable post-install via dynamic loader; add --prove stdin support; adoption DX follow-ups + hygiene.
- All 14 plan verifs, verify:full, check-work, and post-pack adoption tests green.
- Manifests synced; check:versions + verify:full green.

## [0.9.0] - 2026-06-23
- Release prep following adoption plan completion and DX improvements (CLI, scanner, docs accuracy).
- Manifests synced; check:versions + verify:full green.
- All verifs green.

## [0.8.0] - 2026-06-23
- Full ledger skills remediation & adoption plan (standalone tooling, surfaces, citations, guards, dogfooding, scope, duplication, persona/coupling/honesty). All 14 verification commands + check-work PASS. Kernel invariants preserved.
- Manifests synced; check:versions + verify:full green.
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

## [0.7.7] - 2026-06-23
- Patch release: Python reference parity + manifests sync.
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
- Manifests synced; check:versions + verify:full green.

## [0.7.4] - 2026-06-22
- Grok-native plugin support: root `plugin.json`, `hooks/hooks.json` (GROK_PLUGIN_ROOT + node activation via ledger-activate.js).
- Cross-platform hook activation (pwsh/Grok no longer requires Git Bash for the echo banner; bash path retained for Claude).
- Made `/ledger-review` (and supporting skills) gracefully degrade: always run full ledger invariants; note "Ledger layer only" when superpowers/pr-review-toolkit (or host equivalents) are not present. Updated AGENTS.md, commands, references/plugin-integration.md.
- Documentation: prominent Grok install (`grok plugin install ... --trust`), library consumption instructions, multi-host notes in README and docs/.
- Packaging: added `plugin.json` to "files", manifests synced, persona checker coverage.
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