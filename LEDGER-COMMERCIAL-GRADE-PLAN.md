# Ledger Commercial Grade Builder Plan

> **Progress Note (2026-06-21)**: Ongoing iterative execution.
> - Kernel: Money (div, allocate exact, compare), Ledger auditHash.
> - Proof: basic CFA validator + structure checks.
> - Canon: GAAP seed added (revenue + matching); loaded by default.
> - Tests: 51, with allocation + kernel invariants + CFA.
> - Docs/verify:full green; README updated.
> Next per plan: more seeds/constructs, CLI verifier, rich examples, adversarial tests.

**Goal**: Transform Ledger into the canonical, trusted source for simplicity, consistency, and reliability when AI builds financial, accounting, investing, tax, and monetary software artifacts.

**Core Thesis**: Simplicity + ironclad invariants + meme-quality persona = AI that produces build artifacts you can stake reputation (or capital) on. The Bean Counter persona must be so compelling and the rules so unavoidable that "unbalanced", "float", or "uncited" become literally unthinkable during generation.

This plan hardens the kernel, canonical skills, enforcement mechanisms, knowledge foundations, verification apparatus, and visual identity to commercial builder standards. No external dependencies or cross-persona references of any kind.

---

## 1. Current State Evaluation

### Strengths (solid foundation)
- Clean, small, immutable core: `Money` (decimal exactness), `Account`, `JournalEntry`, `validateEntry`, `Ledger` (append-only, equation verification).
- Strong emphasis on determinism and reproducibility (verify script, property tests with fast-check).
- Zero-Skip Execution Protocol articulated (Plan & Unpack → Gap Analysis → complete verified Artifact).
- Knowledge graph with levers for targeted canon retrieval (dimension filtering).
- Distribution skeleton matches professional patterns: skills/*.SKILL.md, commands/*.toml + .md, AGENTS.md, multiple host adapters (.cursor, .clinerules, .windsurf, .kiro, copilot-instructions, .claude-plugin), hooks for activation, pi config.
- All core tests currently pass; basic determinism harness exists.
- MIT license, clean package exports (`ledger` + `ledger/core`).
- Persona ("The Bean Counter") already has memorable framing: "He says nothing. He balances the books to the penny. Mistakes do not leave the building."

### Critical Shortfalls vs. Overarching Goal
1. **Meme Quality & Graphics**: Single `assets/bean-counter.jpg`. Weak visual identity. No logo set, no dark/light variants, no social/banner assets, no before/after story rendered visually, no iconography. The persona lacks the instant, sticky, high-signal visual punch that makes discipline feel inevitable and aspirational.
2. **Enforcement & Canonical Skills**: Rules are present but soft. Zero-Skip Protocol is descriptive rather than structural. Skills and adapters have some repetition and minor drift. No automated consistency enforcement (scripts to keep AGENTS.md / all adapters / SKILL.md / command prompts in lockstep). "Complete Artifact" is mentioned but has no canonical template or machine-checkable structure.
3. **Knowledge Canon Thinness**: One seed file with a handful of illustrative nodes (IFRS concepts + a few FOMC/tax/macro/valuation). Graph traversal is basic substring + dimension match. Missing depth in GAAP, FASB, full IFRS, Basel, derivatives, portfolio accounting, tax regimes (multiple jurisdictions), regulatory reporting, audit standards, etc. Citations feel aspirational rather than authoritative.
4. **Kernel Surface Incomplete for Real Builds**:
   - Money: missing division, comparison helpers, percentage, allocation, formatting with locale, negation safety, serialization round-trip guarantees.
   - No first-class support for explicit FX legs (common real need while preserving strict single-currency balancing).
   - Ledger: simplistic balance (no date-range subledgers, no tags/dimensions, no efficient historical snapshots or Merkle-style audit hashes).
   - No higher-order verified constructs (amortization schedules, depreciation, tax lot methods, accrual engines) expressed as pure functions over the kernel.
   - Reporting (trial balance, statements) not present as provable artifacts.
5. **Verification & Proof Weak for "Trusted"**:
   - 21 tests is a start but insufficient for commercial claims.
   - No adversarial test suite ("try to make the AI break balance").
   - Determinism harness is minimal (two capital entries).
   - No snapshot/golden verification for complex scenarios.
   - No independent CLI verifier that can be run in CI or by humans outside an LLM session.
   - No "Financial Artifact Proof Bundle" (entry + validation + citations + reproducibility hash + human-readable report).
6. **Evidence & Impact**: Zero quantitative proof that using Ledger produces reliably superior artifacts vs. raw prompts. No "error caught" stories, no reproducibility metrics, no cost/latency side-benefits documented. This kills trust and virality.
7. **Examples & Narrative**: Two minimal examples. No compelling end-to-end stories (personal tax-aware ledger, simple bank with interest accruals + regulatory capital, portfolio with mark-to-market + risk limits, invoice + sales tax + settlement). No "generated under Ledger" header pattern or re-verification recipe.
8. **Polish & Commercial Readiness**:
   - Version skew (package.json 0.2.0 vs internal 0.1.2).
   - README still refers to "pony tail" patterns in install sections (cleaned in this session but more polish needed).
   - Limited host adapters depth; no dedicated portability document.
   - No dedicated docs/ tree.
   - CI good but basic; no matrix for knowledge loading, no fuzz, no release automation.
   - Skills lack "always active" language strength and precise "must emit" patterns seen in mature discipline packages.
   - No mechanism to mark intentional simplifications with provenance (analogous to audit comments).

The system currently *aspires* to be the Bean Counter. It must *become* the unavoidable presence.

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

### Phase 3: Kernel Hardening & Minimal Powerful Expansion
Keep the surface small. Add only what is required for real, reliable artifacts.

Target additions (all pure, immutable, with tests + citations where relevant):
- Money enhancements (in core/money.ts):
  - `div`, `negate` (with safety), `abs`, `isZero`, `compare` (returns -1/0/1), `equals`.
  - `allocate(ratios: number[])` for splitting amounts exactly (handles remainders deterministically).
  - `toFormat({decimals?, symbol?})` and basic internationalization hook (no heavy deps).
  - `toJSON()` / `fromJSON()` with version stamp for safe long-term storage.
  - Provenance and `asOf` propagation improvements.
- Explicit but safe multi-currency support:
  - Add `FXRate` value object (fromCurrency, toCurrency, rate: Money or exact factor, source, asOf).
  - `convert(m: Money, rate: FXRate): Money` that produces the leg with citation.
  - Update journal validation to allow explicit multi-leg FX entries when a rate + citation is attached (still rejects silent mixing).
- Ledger / Journal:
  - Optional `tags: Record<string, string>` on entries and lines for dimensions (account, department, project, tax-year).
  - `snapshot(asOf: string)` returning immutable view + hash.
  - `auditHash()` : stable hash over entire entry sequence (for Merkle-like chaining).
  - `replay(entries)` for reconstruction verification.
- New verified helpers (in new `src/constructs/` or keep minimal in core):
  - `createAccrual(...)`, simple amortization schedule builder that emits sequence of validated entries + proof.
  - `reconcile(twoLedgers)` diff with imbalance report.
- Stronger validation errors: structured, with codes, suggestions ("use createBalancedEntry").
- Export `VERSION` and a `getLedgerKernelSignature()` for provenance in generated artifacts.

All new surface must be exercised in the determinism harness and property tests. Add "never allow mutation" tests.

**Principle**: Every new helper must be impossible to misuse in a way that violates invariants.

### Phase 4: Canon & Knowledge Graph to Authoritative Level
Make "grounded in canon" real.

- Expand `src/knowledge/seeds/`:
  - `gaap.ts` (core concepts, revenue recognition, matching, etc.).
  - `ifrs-full.ts` (deeper elements, measurement, presentation).
  - `us-tax.ts`, `ifrs-tax-examples.ts` (at minimum common cases).
  - `valuation.ts` (multiples discipline, DCF basics with citation hygiene).
  - `regulatory.ts` (high-level Basel pillars, SOX control concepts if relevant).
  - `fomc-monetary.ts`, `macro-cycles.ts`.
- Make seeds versioned + provenance-rich. Add effective dates and jurisdiction.
- Improve graph.ts:
  - Add real edges (e.g. "specializes", "requires_citation_for").
  - Better indexing (simple but effective inverted index or pre-filter).
  - `fetchWithProof` that returns not just citations but the minimal justifying subgraph.
  - Support for "or" / priority in levers.
- Add `scripts/build-knowledge.js` that can validate seeds (schema + no conflicting ids) and optionally bundle a compact JSON for runtime.
- In `loadDefaultKnowledge`, support overrides / user seeds for jurisdiction-specific policy.
- New skill/command surface: `/ledger-cite` must now always return usable "attach this to entry" text.
- Add a machine-readable `canon-index.json` (or generated) for external tools.

**Success metric**: For common tasks (asset recognition, revenue, basic tax, policy rate application), the graph returns specific, citable nodes with locators that can be traced to real standards.

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

## 7. Immediate Next Actions (Start Today)

1. Accept this plan. Create tracking issue or project board.
2. Commission or generate Phase 1 graphics (use the character brief above).
3. Implement `scripts/check-rule-copies.js` + wire into CI and `verify:full`.
4. Rewrite `skills/ledger/SKILL.md` into its final crisp form + propagate to AGENTS.md and one adapter as pilot.
5. Expand Money with `div`, `allocate`, `compare` + tests.
6. Add first two additional knowledge seeds (gaap + us-tax core).
7. Define the CFA interface in `src/verify/artifact.ts`.
8. Update README hero + numbers section with new graphics once ready.
9. Add one rich example (simple-bank with accrual) exercising new surface + CFA.

Run `npm run verify:full` after every change batch.

---

Ledger's promise is simple: when an AI builds financial things under these rules, the result is correct by construction, cited where it matters, and reproducible forever.

The Bean Counter does not negotiate. This plan makes that presence commercial-grade, unavoidable, and visually unmistakable.

"Balance the books."
