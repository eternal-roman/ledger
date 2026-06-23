# Python Canonical Extension Plan
## Maturing the Reference Implementation for Real-World Audits (Complex Python Financial Systems + Any Python Repo)

**Context & Motivation**
The primary historical failure in ledger audits against Python codebases (e.g. cryptocurrency trading bots, portfolio engines, risk systems, backtesters) was the absence of a usable, kernel-faithful Python implementation of the canonical primitives.

We have delivered the foundation:
- Complete core port: `Money`, `FXRate`, `Account`, `JournalEntry` + `validate_entry`, `Ledger` (immutable `apply`, balances, `verify_fundamental_equation`, `audit_hash`, trial balance, etc.).
- Determinism harness (`verify_determinism`), `CanonicalFinancialArtifact`.
- Shipped under `reference-implementations/python/ledger/`.
- Integrated into SUPER_LEDGER_AUDIT_PROTOCOL (Phase 0 mandatory bootstrap + proof).
- Verified: tests, trace replay example, package import, no-float, subscale, mixed-currency, JSON roundtrip, multi-step apply + equation.

**Current State (v0.7.3-ref core only)**
- Strong on the immutable double-entry kernel.
- Sufficient for modeling basic flows (capital, fills, fees, PnL legs, equity).
- Missing higher layers that the TS ledger provides on top of the kernel (these are what make audits powerful for real domains).

**Goal**
Make the Python canonical a *first-class, production-usable, audit-grade* mirror so that any Python financial codebase can:
1. Adopt it directly (or use during audit).
2. Have its monetary lifecycles expressed and proven via the same primitives.
3. Support deep transaction tracing in audits using real `Ledger.apply` sequences.
4. Enable cross-language golden-master / conformance testing.

---

## Phased Roadmap

### Phase 1: Core Parity & Polish (Immediate, 1-2 sessions)
- **Finish any missing core fidelity**
  - Exact `scale` quantization behavior + `to_fixed`/`toFormat` parity.
  - `allocate` remainder-to-last rule edge cases.
  - Full `fromJSON` / `toJSON` + `auditHash` byte-for-byte compatibility where possible (document differences).
  - Better error messages mirroring TS.
  - `FXRate` + `convert` + `createFxConversion` full coverage + tests.
- **Improve test harness**
  - Port more property-based tests (using `hypothesis`).
  - Add explicit "replay golden sequence from TS examples" tests (small-bank, simple capital + draws, compound entries).
  - Add `verify_audit_readiness.py` (already added) to CI-style checks.
- **Documentation inside the ref**
  - `README.md` in the python/ dir explaining usage in audits + "how to model a trade fill".
  - Examples for common patterns: FIFO cost basis reconstruction, fee application, partial exits, MTM.
- **Deliverable**: Python ref passes "full kernel audit" using the SUPER protocol against itself.

### Phase 2: Higher-Layer Parity (Critical for Real Audits)
Port (or faithfully re-express) the layers that sit on the kernel in TS `src/`:
- `trading/` (postings, accounts for CEX, trade fill journal entries).
- `portfolio/` (lots, cost basis, valuation, PnL).
- `investing/` (allocation, rebalance, returns calculations expressed as entries).
- `crypto/` (transfers, exchange modeling).
- `instruments/` (registry, asset scales).
- `rules/` (recognition validation using knowledge graph).
- `knowledge/` (lightweight citation graph seeds or stubs; at minimum the levers for citations in entries).

**Approach** (not naive 1:1 port):
- Everything must go through the kernel (no bypassing with raw Decimal).
- Provide "reconciliation helpers": e.g. `reconcile_trade_fill(trade_dict) -> list[JournalEntry]`.
- Include realistic examples that a Python trading bot would use (e.g. Kraken fill → balanced entries for inventory + fee + realized when exiting).

**Quantitative target**: At least one full end-to-end example (capital → buy fill → partial sell → realized PnL + fees) modeled with entries + proven via `runTrace` + equation + hash.

### Phase 3: Interop, Conformance & Tooling
- **Cross-language conformance**
  - Golden sequence files (JSON arrays of entries) generated from TS.
  - Python loads them, rebuilds Ledger, asserts `audit_hash` and balances match (within documented rounding).
  - Script: `python -m ledger.tools.conformance --ts-golden fixtures/`.
- **Shared test vectors**
  - Evil numbers for drift (repeating decimals, many partials, tiny fees).
  - Multi-currency FX legs.
- **Scanner / inventory for Python**
  - Improve the protocol's expectation: provide or document a real `ast` + name-based monetary expression scanner (extend the sketch in the protocol).
  - Optional: small CLI `python -m ledger.audit scan .` that produces the inventory.json expected by the protocol.
- **Determinism harness parity**
  - Make Python's `verify_determinism` produce identical output shape (or documented mapping) to TS.
  - Add `auditHash` chain verification test that replays a sequence built in TS.

### Phase 4: Packaging & Adoption
Options (evaluate):
A. Keep as reference only (current) — copy the dir into target audits.
B. Make installable:
   - `pip install ledger-py` (or `ledger-python`) that exposes the package.
   - Include in the main `ledger` npm package under `reference-implementations/` (already happening) and document "for Python audits".
C. Dual package + build:
   - Separate repo or subdirectory that can be released independently.
   - Provide pyproject.toml, proper versioning aligned with TS major.
- Add "Python Canonical" section to main README + AGENTS.md.
- Provide cookiecutter or `ledger new-audit-python` style helper (lightweight) that copies the ref + a starter `reconcile_*.py` + `audit_artifacts/` structure.

**Integration with SUPER protocol**: Update protocol to say "copy or `pip install` the canonical; run its tests first."

### Phase 5: Advanced / Ecosystem
- Full knowledge graph seeds port (or minimal citation fetcher) so `/ledger-cite` style usage works in Python audits.
- Higher-order examples: backtester equity curve expressed as MTM entries; grid strategy profit attribution as separate bucket entries.
- Performance notes (Decimal is slower than float — document when it's acceptable).
- Optional: thin "adapter" layer for popular Python finance libs (e.g. helpers that turn ccxt fills or pandas data into canonical entries).
- Future languages: use the Python + TS as the spec for a Rust or Go canonical if demand appears.

---

## Success Criteria (Measurable)
- [ ] A real Python trading bot (or equivalent complex financial Python codebase) can have its primary money paths modeled + replayed in <1 day of audit work using the canonical.
- [ ] All core kernel invariants proven in both directions (TS builds seq → Py replays and matches hashes/balances; and vice-versa).
- [ ] SUPER protocol execution on a Python target produces >=8 numeric kernel traces using the shipped Python ref (not ad-hoc).
- [ ] The ref impl is "complete enough" that higher-layer business logic (sizing, risk gates, PnL) can be turned into balanced entries without inventing treatments.
- [ ] Packaging decision made + implemented (at least pip-installable + docs).
- [ ] No "we had to build our own Money from scratch" complaints in future audits.

---

## Immediate Next Steps (Post This Plan)
1. Land current work (already committed on the feature branch).
2. Open discussion / PR for the Python ref (even as reference).
3. Pick Phase 1 items and implement (start with conformance vectors + better examples).
4. Add a `python` example to the main `examples/` or `reference-implementations/python/examples/` that mirrors one of the TS examples (e.g. small-bank or personal-ledger style).
5. Update the SUPER protocol with any learnings from the first real Python audit using the new ref.
6. (Optional but powerful) Use the protocol against the ledger *itself* in Python form to eat our own dogfood.

---

## Non-Goals (for now)
- Full re-implementation of every TS file 1:1 (focus on audit-useful surfaces).
- High-performance production runtime for Python (the point is exactness + proofs, not speed).
- Supporting every weird edge of every exchange at layer 1 (that's the target's responsibility; the canonical is the truth ledger).

---

**Owner**: Ledger Chad team + any agent executing audits on Python financial systems.

**Priority**: High — this was explicitly called out as one of the two reasons prior audit processes "failed miserably."

**When complete**: Auditing any Python repo will start with "copy or pip the canonical, prove it, then model everything through it." Double-Entry or Get Beta will actually be enforceable in Python codebases.

*End of plan. Execute top-down, measure with actual modeled traces + protocol runs.*
