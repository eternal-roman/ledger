# Ledger Commercial Grade Builder Plan

**Status (v0.4.4)**: Kernel complete + auditHash (tamper-evident), improved exact FX/multi-currency. 80 tests, verify:full + persona check green. Output Contract + CFA validator live in SKILL + commands. check:persona wired. MCP releases + CI on feature/fix branches.

**Goal**: The canonical source for AI agents building financial software. Simplicity + ironclad invariants + "The Bean Counter" persona so that unbalanced/float/uncited states become impossible to emit.

**Core Thesis**: Simplicity + ironclad invariants + meme-quality persona = AI that produces build artifacts you can stake reputation (or capital) on. The Bean Counter persona must be so compelling and the rules so unavoidable that "unbalanced", "float", or "uncited" become literally unthinkable during generation.

This plan hardens the kernel, canonical skills, enforcement mechanisms, knowledge foundations, verification apparatus, and visual identity to commercial builder standards. No external dependencies or cross-persona references of any kind.

---

## Current State (condensed)
**Strengths**: Immutable kernel (Money exact + provenance, JournalEntry, validateEntry, Ledger with equation). Determinism harness + 51 tests. Zero-Skip protocol. Graph + levers for canon. Full skills/commands/persona distribution. v0.4.0 green.

**Remaining focus areas** (per original plan): stronger visual persona assets, deeper canon seeds, richer verified constructs over kernel, adversarial + golden tests, CLI verifier, examples with end-to-end stories, automated consistency for docs/adapters.

The system must make unbalanced, imprecise, or uncited financial artifacts impossible to produce.

---

## 2. Overarching Design Principles for the Plan

- **Simplicity First**: Every addition must justify itself against the kernel. Prefer fewer primitives + ironclad guarantees over feature breadth. The "fewest lines that still satisfy invariants + citations" rule applies to Ledger itself.
- **Enforcement > Description**: Skills, hooks, and verification must make deviation expensive or impossible for the AI. The protocol must produce checkable artifacts.
- **Single Source of Canonical Truth**: `skills/ledger/SKILL.md` + `AGENTS.md` + core implementation are authoritative. All adapters, commands, docs derive from them via scripts.
- **Meme Quality as Force Multiplier**: Visual identity + slogan + persona must create instant recognition and emotional commitment. "Mistakes do not leave the building."
- **Measurable Trust**: Every claim ("deterministic", "balanced", "cited") must be mechanically provable in the repo and in generated artifacts.
- **Zero External Coupling**: Ledger is standalone. All references to other discipline systems removed permanently.
- **Commercial Grade**: Production-grade error messages, serialization safety, auditability, extensibility without fragility, excellent DX for both human maintainers and LLM builders.

---

## 3. Comprehensive Phased Plan

### Phase 0: Foundations & Self-Containment (Immediate)
- [x] Remove every mention of external personas or sibling relationships (completed in this session for README, skills, hooks).
- Audit all files again for drift.
- Standardize version to single source (e.g. pull from package.json at build or hard-sync to 0.3.0 target).
- Add SECURITY.md, CONTRIBUTING.md, CHANGELOG.md (aligned with existing patterns in workspace).
- Add `.github/ISSUE_TEMPLATE` for "financial invariant violation" and "canon gap" reports.

**Deliverable**: Clean, self-contained repo at a consistent v0.3.0 baseline. `npm run verify:full` green.

### Phase 1: Meme-Quality Graphics & Visual Identity (High Impact)
The single jpg is insufficient for the "meme quality" that drives adoption and internalizes the persona.

Actions:
- Create professional, high-contrast, memorable Bean Counter visual suite:
  - Primary logo (svg + png + webp), light + dark variants.
  - Icon / favicon set (multiple sizes).
  - Social preview / og:image (1200x630) with slogan.
  - "Before/After" or "Pass/Fail" visual cards (unbalanced entry → red pencil X vs. balanced green check).
  - Banner for README and docs.
  - Optional animated or multi-panel for impact (static first).
- Update all references (README center image, AGENTS, skills) to use new assets with proper alt text and responsive picture elements.
- Add `assets/` structure: `logo/`, `icons/`, `banners/`, `examples/`.
- Produce a one-page "The Bean Counter" character sheet (persona, rules summary, visual) for agent context or marketing.
- Slogan hardening everywhere: "He says nothing. He balances the books to the penny. Mistakes do not leave the building." + "The best financial construct is the one that cannot be wrong."

**Success**: New visuals feel instantly "exact and unyielding." Repo looks premium and ownable. README hero image commands attention.

**Tooling note**: Use high-quality generation or hand-refinement for the exacting accountant archetype (green eyeshade, red pencil, massive ledger, stern expression, minimal background). Preserve high contrast, vintage-yet-crisp aesthetic.

### Phase 2: Canonical Skills Hardening & Consistency Enforcement
Make the skills the enforceable law.

- Rewrite `skills/ledger/SKILL.md` as the crisp, compact source of truth (modeled on mature discipline patterns but domain-specific):
  - Persistence section: "ACTIVE EVERY RESPONSE for monetary value, accounts, recognition, measurement, risk, tax, valuation."
  - The Zero-Skip Ladder as numbered, mandatory decision sequence.
  - Non-negotiables in bullets.
  - Exact code patterns that **must** appear.
  - "Output contract": what the response must contain before any implementation (see Phase 5).
  - Boundaries clear.
  - "stop ledger" escape hatch documented.
- Make sub-skills (verify, audit, cite, reconcile, sim) reference the main ledger skill and add precise invocation rules.
- Add `scripts/check-rule-copies.js` (or .ts) that:
  - Extracts the core ladder + non-negotiables from SKILL.md.
  - Verifies AGENTS.md, all 5 adapter files, all command .toml prompts, and .md docs contain the required canonical text (or approved short forms).
  - Fails CI on drift.
- Update `package.json` scripts: `"check:persona": "node scripts/check-rule-copies.js"`, integrate into `verify:full`.
- Add intensity or "strictness" if needed (lite/full/audit-only) but keep default "uncompromising".
- Strengthen hook activation message and make it report the active canonical version.

**Deliverable**: All persona surfaces are provably derived from one source. LLM cannot "forget" the ladder.

### Phase 3: Kernel Hardening & Minimal Powerful Expansion [x cycle 1]
Keep the surface small. Add only what is required for real, reliable artifacts.

Target additions (all pure, immutable, with tests + citations where relevant):
- Money enhancements (in core/money.ts): [done] div, allocate, toFormat, convert via FXRate, toJSON/fromJSON, provenance in add etc.
- Explicit but safe multi-currency support: [partly from remote + FXRate] 
- Ledger / Journal: [done] tags, snapshot, auditHash, replay, multi-curr balance, trialBalance, summarize.
- New verified helpers: [partial]
- Stronger validation errors, VERSION exported.

All new surface exercised in tests/harness. 

**Principle**: Every new helper must be impossible to misuse in a way that violates invariants. [followed]

### Phase 4: Canon & Knowledge Graph to Authoritative Level [x partial cycle 2]
Make "grounded in canon" real.

- Expand `src/knowledge/seeds/`: [done gaap + ifrs expanded from remote]
  - `gaap.ts` added.
- Make seeds versioned: [partial]
- Improve graph: [existing edges in gaap]
- `loadDefaultKnowledge` updated with gaap.
- New skill/command surface: [future]

**Success metric**: ... [improved with gaap for revenue etc]

### Phase 5: Formalize & Enforce the Zero-Skip Execution Protocol
This is the heart of "reliable build artifacts via AI".

Define a **Canonical Financial Artifact** (CFA) that the agent **must** produce before (or alongside) any implementation code:

Structure (enforced in skills):
1. **Scope Declaration** — exact touch points (value movement, accounts, recognition event, risk parameter, etc.).
2. **Assumptions Log** — every date, jurisdiction, rate, source, model choice with explicit "asOf".
3. **Canon Citations** — output of `/ledger-cite` or graph fetch; each with lever used.
4. **Kernel Plan** — the exact sequence of `Money.from`, `makeLine` / `createBalancedEntry`, `JournalEntry`, `Ledger.apply`, `verifyFundamentalEquation` calls. Include any construct helpers.
5. **Proof Sketch** — "All entries validated at construction; equation checked per currency; hash = X".
6. **Reproducibility Contract** — seed (if any), full input set for replay.
7. **Generated Code** — only after above.

Implementation:
- Add `src/verify/artifact.ts` with types + `validateCanonicalArtifact(textOrObject): {ok, violations}` (simple structural + regex for required sections + kernel symbol presence).
- In skills and commands: the AI **must emit** the CFA sections (or a machine-readable block) before implementation. `/ledger-verify` and `/ledger-audit` gain "check for CFA presence + completeness".
- Update `fullVerify` to accept optional artifact metadata.
- Add a small "ledger-proof" comment header convention that generated files can include:
  ```ts
  // @ledger-proof: version=0.3.0, artifact-hash=..., citations=ifrs-..., kernel-pass=true
  ```
- New command `/ledger-reconcile` and `/ledger-sim` must output CFA-structured results.
- In examples and tests, demonstrate full CFA.

This turns "Zero-Skip" from slogan into observable, reviewable output.

### Phase 6: Verification, Testing & Determinism to Commercial Standards
- Expand test matrix to ≥80 focused + property tests.
- Add adversarial suite: `tests/adversarial/` — prompts/inputs designed to tempt violation (float temptation, unbalanced construction, hidden rate, mutation). Verify kernel still rejects.
- Snapshot testing for determinism: complex multi-step ledgers (bank with daily interest, portfolio rebalance) produce byte-identical replay hashes and balance reports.
- Enhance `scripts/verify-determinism.ts`:
  - Load golden scenarios from `tests/fixtures/ledgers/*.json`.
  - Compute full auditHash + equation + citation presence.
  - Support "replay from seed" verification.
- Add CLI entrypoint: `bin/ledger-verify` (or via `npx ledger verify <path|diff>`).
  - Static scan for forbidden patterns (bare numbers in money contexts via simple heuristics + TS parser if feasible without heavy deps).
  - Run kernel on any embedded example entries.
  - Exit non-zero on violations. Perfect for pre-commit and CI.
- Integrate fullVerify + artifact validation into the harness.
- Property tests must cover: multi-currency with explicit FX, allocation remainders sum exactly to original, replay always matches, equation holds after any valid sequence.
- Add "reproducibility under model variation" note (different LLMs produce different *text* but same kernel invariants when following rules).

**Target**: `npm run verify:full` takes <30s, covers real usage, and is the gate for all PRs.

### Phase 7: Compelling Examples + Impact Evidence
- Expand `examples/`:
  - `personal-tax-ledger.ts` — salary, deductions, estimated tax, year-end reconciliation with citations.
  - `simple-bank.ts` — deposits, loans, interest accrual (daily), reserve requirement example, full equation + auditHash.
  - `portfolio.ts` — positions, mark-to-market entries, FX conversion legs, allocation, risk limit check (all kernel-proven).
  - `invoice-settlement.ts` — revenue recognition + tax + settlement + FX.
- Each example must:
  - Emit a CFA.
  - Run the determinism harness on its output.
  - Be executable (`if (import.meta.main)`).
- Add `benchmarks/` or `evidence/`:
  - Synthetic "error injection" study: raw LLM attempts vs. Ledger-constrained on 8-12 common financial tasks. Report violation rate, time to correct balance, citation presence.
  - Reproducible harness (even if using promptfoo or custom script) showing "with Ledger rules: 0 unverified states".
  - Document side benefits (smaller diffs because wrong paths are rejected early).
- Update README with powerful before/after using real financial smell (e.g., "Agent wrote `balance * 0.075` for interest" → proper Money + accrual entries + citation to policy).

**Outcome**: Concrete proof that the system delivers on "reliable build artifacts".

### Phase 8: Distribution, Adapters & Frictionless Adoption
- Complete adapter parity across major hosts (add or harden any missing .kiro, copilot, etc.).
- Create `docs/agent-portability.md` (self-contained) explaining copy-the-file or plugin-install for each.
- Enhance `.claude-plugin/` and marketplace metadata.
- Add optional "global" install guidance.
- Improve hook: richer activation (print current mode or kernel version).
- Add `gemini-extension.json` style if patterns emerge, and other marketplace manifests as needed.
- `README.md` hero section: strong visual + 3-bullet value + "install" that is one line for common hosts + "copy AGENTS.md for anything else".
- Add "Works with X hosts" badge placeholder.
- Update package "files" and exports as kernel grows (e.g. `./constructs` later if needed).

### Phase 9: Developer & Commercial Tooling
- Add `bin/ledger` CLI (small tsx or compiled):
  - `ledger verify [file|dir|stdin]`
  - `ledger cite <query> --levers '...'` 
  - `ledger sim <scenario-file>`
  - `ledger audit [path]`
- Document and ship it.
- Add "Financial Proof Bundle" serializer (JSON + human report) usable by both CLI and library.
- Improve error messages with "did you mean" and "correct pattern" examples.
- Add typed docs (TSDoc on all public API + example snippets that are tested).
- `docs/`:
  - `core-invariants.md`
  - `zero-skip-protocol.md` (with CFA template)
  - `canon-sources.md`
  - `building-with-ledger.md` (patterns for AI + human)
- Security: sign releases? At minimum reproducible build notes.

### Phase 10: CI, Release, Maintenance & Governance
- Strengthen `.github/workflows/ci.yml`:
  - Matrix Node + OS.
  - `npm run check:persona`
  - `npm run verify:full`
  - Adversarial + snapshot steps.
  - Knowledge seed validation.
  - Optional: artifact validation on changed examples.
- Add release workflow (or use existing patterns): conventional commits, changelog update, version bump, publish with provenance.
- Add `scripts/` for:
  - `build-openclaw-skills.js` equivalent if relevant.
  - Knowledge bundler.
  - Persona sync checker (Phase 2).
- Maintain AGENTS.md / skills as single source; update plan when protocol evolves.
- Add "Ledger Doctor" internal command or script that suggests minimal kernel fix for common violations.

---

## 4. Prioritized Sequencing & Milestones

**Milestone 0 (Now)**: Cleanup complete, no external refs, consistent versions, tests green. (Done for refs.)

**M1 (2-4 weeks)**: Graphics suite + Phase 1 visuals in repo + README refresh. Phase 2 persona consistency script + hardened main SKILL.md. CI green on `check:persona`.

**M2 (4-8 weeks)**: Kernel expansions (Money + basic FX + auditHash). Expanded knowledge seeds (at least GAAP + deeper IFRS + one jurisdiction tax). Zero-Skip CFA types + validation. 3 new rich examples with full artifacts.

**M3 (8-12 weeks)**: Full verification upgrade (CLI + snapshots + adversarial). Evidence/benchmarks section. All adapters documented. `npm run verify:full` now includes artifact checks.

**M4 (12+ weeks)**: CLI bin published. docs/ complete. Impact numbers in README. External beta users / real project integration reports. v1.0.0 cut when "commercial grade" bar met (see metrics).

Parallelize where possible: graphics + skills hardening can start immediately; kernel and knowledge are largely independent.

---

## 5. Success Metrics (Quantitative + Qualitative)

- **Reliability**: 0 unverified / unbalanced states escape in all examples + benchmark suite. 100% of generated financial code in tests passes `validateEntry + verifyFundamentalEquation + artifact validate`.
- **Coverage**: ≥80 tests, property coverage on key invariants, ≥5 rich examples each with replay proof.
- **Canon**: Graph returns specific citations for 20+ common concepts across domains.
- **Enforcement**: `check:persona` + CI prevents any drift. Skills describe exact required code patterns.
- **Adoption Signals** (longer term): stars, issues referencing "caught my float", "replay matched", "passed audit on first try".
- **Simplicity Guard**: Core public API surface growth < 2x from today while supporting the new examples. "Money + JournalEntry + Ledger" remains the 90% path.
- **Visual**: New assets used consistently; README hero is distinctive and professional.
- **DX**: `npx ledger verify` works out of box; `npm test` + verify < 1 min.
- **Commercial Claim**: "Ledger-constrained AI builds pass structural audit on first generation in the covered domain."

---

## 6. Risks & Mitigations

- **Over-expansion destroying simplicity**: Strict "kernel first" review gate. Every PR addition must show a 3-line usage in an example + proof it can't be done with existing surface.
- **Canon maintenance burden**: Seeds are additive and versioned. Graph is deliberately simple (no full DB). Focus on high-leverage facts initially.
- **AI still finds creative bypasses**: Adversarial testing + continuous improvement of ladder language + CFA requirement. The escape hatch ("stop ledger") is documented.
- **Graphics subjectivity**: Define clear brief (exacting, high-contrast, minimal, memorable, accountant archetype with ledger/red pencil). Iterate with concrete "does this make you feel the books must balance?" test.
- **Adoption chicken-egg**: Start with perfect self-application (Ledger repo itself and all examples must be exemplary). Then strong narrative + numbers.
- **Versioning of artifacts**: Kernel signature + proof bundle version field solves long-term reproducibility.

---

## 7. Current Focus (plan largely executed)

- Maintain 80+ tests + determinism + persona enforcement in CI.
- Strengthen CFA emission in examples/commands + adversarial cases.
- Compress AI layer + docs for logic density (this iteration).
- Keep kernel minimal; every addition must prove necessity via tests + example.

Run `npm run verify:full` after every batch. Historical phases complete or in maintenance.

---

## 8. Honest Assessment & Gap Closure (branch: docs/ifrs-15-16-engine-scope, v0.4.4)

**Question from assessment**: Can AI build sophisticated financial software with main today?  
**Answer on main (pre-branch fixes)**: No — kernel is a solid guardrail foundation, not a full tool suite.

**What works well (kernel + this branch)**:
- Exact arithmetic (decimal.js, no IEEE-754). Money.from rejects non-integer numbers.
- Double-entry enforced at type/kernel (validateEntry cannot be bypassed).
- Immutable Ledger + pure apply().
- Chart of accounts (typed categories + normal balance).
- Basic statements (trial balance, incomeStatement, balanceSheet).
- Knowledge graph + GAAP/IFRS seeds + citation levers.
- **Branch fixes delivered**: tamper-evident auditHash (SHA-256 chain, length-prefixed), FXRate exact (string/Decimal never parseFloat), multi-currency balance fails-closed (no silent drop), rules now enforce structural signatures (revenue credits Income, lease has Asset+Liab, etc.).

**Gaps vs sophisticated software (status on this branch after working the plan):**

1. **No persistence** — toJSON/fromJSON only on Money. Ledger/JournalEntry lack full roundtrip. → **In progress (closing)**: adding deterministic serialization for JournalEntry + Ledger.
2. **No chart of accounts management** — ad-hoc creation only. No registry/hierarchy/opening balances/locking. → **Minimal close**: introduce pure ChartOfAccounts helper (list, lookup, apply openings via kernel entries).
3. **No period closing / fiscal periods** — dates are validated strings; snapshot is view not close. No retained earnings rollover, period locks. → **Closing via IFRS plan**: M0 introduces validated time/periods (see IFRS 15/16 engine design spec on branch).
4. **No reporting beyond basics** — single-currency primary views; missing cash flow, aging, subledgers, bank rec, dept P&L. → Basic currency-complete now; full engine to come.
5. **Rules are shallow (no IFRS 15/16 engine)** — branch improves to signature checks but no 5-step model schedules, lease amortization, depreciation. → **Plan active**: docs/superpowers/specs/2026-06-21-ifrs-15-16-engine-design.md defines M0-M5; implementation starts with time + schedule core.
6. **No transaction patterns/workflows** — only primitives (makeLine, createBalancedEntry, createFxConversion). No invoicing, payment application, dep runs. → Primitives + CFA guardrails allow composition; higher constructs follow scoped use cases.
7. **FX on main broken** — floats, silent drops, forgeable hash. → **CLOSED on branch**. FXRate/Money/auditHash/multi-curr all exact + proven in tests.
8. **No npm publishable package** — dist/build present, package.json exports configured, README says `npm install ledger`. → **Closing**: add prepublishOnly, clean/pack verification, confirm artifact integrity.

**Recommendation executed**: Branch merges the critical fixes (hash, FX, floats, rules). Library is now a stronger guardrail. For full toolkit, the IFRS engine scope + serialization + periods + CoA provide the next concrete layers. Scope to "AI can generate + persist + reconcile IFRS-compliant schedules for leases/revenue" as the target use case.

**Branch work-through of plans**:
- Commercial plan phases 0-6 largely complete (kernel, CFA, verify:full, 80 tests, persona).
- IFRS umbrella spec approved; sequencing M0 (time/measure) → M1/M4 first value.
- All new constructs will use kernel + emit CFA + golden tests reproducing standards examples.

Ledger now lets an AI get farther: serialize state, enforce deeper rules, lay time foundation for real schedules.

---

Ledger's promise is simple: when an AI builds financial things under these rules, the result is correct by construction, cited where it matters, and reproducible forever.

The Bean Counter does not negotiate. This plan makes that presence commercial-grade, unavoidable, and visually unmistakable.

"Balance the books."
