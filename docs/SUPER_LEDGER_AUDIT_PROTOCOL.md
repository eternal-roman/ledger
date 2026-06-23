# SUPER_LEDGER_AUDIT_PROTOCOL
## Adversarial, Zero-Skip, Kernel-Powered Financial Invariants Audit for ANY Repository
### Version: 3.0 (Kernel-First, Cross-Language, Transaction-Trace Hardened)
### Status: The 10x potency replacement for handwavy surface scans

**Primary Failure Modes This Protocol Exists To Kill:**
1. "No canonical in the target's language" → every audit first bootstraps a faithful kernel mirror (reference implementations provided; must pass the same determinism + equation proofs).
2. "Audit was handwavy, never used the strength of the kernel or transaction tracing" → every monetary lifecycle is REBUILT as exact JournalEntry sequence, REPLAYED via immutable successive Ledger.apply(), with per-step snapshots, balance proofs, auditHash, equation verification, and numeric side-by-side vs the subject's native code (float or ad-hoc Decimal).

This protocol is language- and domain-agnostic. It applies to trading bots, banks, investment platforms, SaaS billing, payroll, DeFi indexers, risk engines, or any codebase that touches value, accounts, recognition, measurement, PnL, fees, sizing, valuation, or risk pricing.

**Usage Instructions (copy entire file into a fresh clean session):**
1. Start a **brand new** conversation (no prior memory of the target repo).
2. Paste this entire protocol as the first message. Optionally prepend: "Current workspace: [abs path]. OS: [ ]. Target language(s): [ ]. Execute this protocol verbatim with zero shortcuts or summarization. Use tools (write, run, grep -B/-A, read_file) relentlessly."
3. First 5 actions (mandatory):
   - list_dir .
   - Read CLAUDE.md / AGENTS.md / README + this protocol + the reference canonicals.
   - Begin **PHASE 0** by ensuring/creating the canonical for the target's language (use native if TS/JS + ledger package; copy+adapt reference for Python; implement faithful mirror for others).
   - Immediately `run` import + basic + determinism tests on the canonical you are using.
   - Only then proceed to inventory.
4. Never "read and summarize". Write scanners, simulators, reconcilers, trace scripts. Execute them. Capture output. Prove every claim with numbers or exact snippet + execution result.
5. Maintain a running todo. Before advancing phases, re-run your own inventory/scanner against findings so far.
6. At the very end emit the exact ENFORCER VERIFICATION block with evidence pointers.
7. The permanent deliverables are runnable artifacts + a working canonical (if missing) + enforcement code that the next session or the project can actually use.

**Non-Negotiable Self-Enforcement Rules (violate = start over):**
- Float (or native number for amounts) is guilty until a concrete execution of the canonical + subject's code on identical input numbers proves innocence with zero material drift.
- Every claim of "roughly balances", "close enough", "within tolerance" must be accompanied by exact delta, at which operation it appeared, and whether a decision (gate, partial fill, "profitable?", sizing qty, Sharpe input) would flip.
- You must model money movement with the kernel: `Money.from_(str|Decimal|int only)`, `make_line`/`create_entry` (or balanced), `validate_entry`, `Ledger.apply` (capture returned new ledger every time), `verify_fundamental_equation()`, `audit_hash()`.
- Quantitative minimums for this execution (raise if subject is large):
  - >= 120 distinct monetary expressions / operations / accumulators / boundary crossings catalogued with file:line + classification.
  - >= 8 concrete numeric counter-examples (delta > 0.005 in reporting currency, or decision flip, or >0.05% accumulation drift over realistic sequence).
  - >= 6 full numeric lifecycle traces (each with >=4-6 steps), each implemented as runnable script that builds entries, applies to Ledger step-by-step, prints side-by-side + proofs.
  - >= 4 runnable verification / attack scripts executed and output captured.
  - The canonical (native or port) must be used for 100% of modeling and proofs in the audit.
- "I read the file" is forbidden. Extract via scanner or grep -B3 -A3, then operate on the extracted expressions in code you wrote.
- At uncertainty: write a diagnostic script, run it, include stdout.
- Assume the subject code was written by an adversary who wants precision loss and imbalance to be invisible. Hunt second- and third-order effects (accumulation loops, restart reloads, TA->sizing, equity curve -> optimization objective, multiple uncoordinated "books").
- No phase may be summarized or skipped. Deliver all artifacts listed.

**Reference Canonicals (shipped with this protocol in the ledger package):**
- TypeScript/JS: `import { Money, JournalEntry, validateEntry, Ledger, emptyLedger, ... } from 'ledger'` (or `ledger/core`).
- Python: `reference-implementations/python/ledger/` (copy the dir or sys.path it). Full faithful port: Money (no raw non-int float, Decimal), Account, JournalEntry+validate (exact per-currency balance + scale guard + no mixed-curr), Ledger (immutable apply, balances, verify_fundamental_equation, audit_hash, trial, income/balance sheet), verify_determinism + CanonicalFinancialArtifact validator.
  - Tests live at `.../tests/test_canonical.py`. Run them first.
  - Example trace: `.../examples/trace_example.py`.
- For other languages: implement mirror using the above as spec. Required properties that must be proven: (a) Money.from rejects non-int float, (b) create/validate rejects unbalanced + sub-scale + mixed-curr, (c) Ledger.apply is immutable and re-validates, (d) two builds of same entry sequence produce identical audit_hash and pass equation, (e) roundtrip via JSON.

**Quick Kernel Cheat Sheet (use constantly):**
- `Money.from_(value, currency, as_of?, provenance?)` — value must be str/int/Decimal for fractional. Never parseFloat.
- `create_balanced_entry(id, date, dr, cr, amount:Money, desc, citations?)`
- `create_entry(...)` + internal `validate_entry` (throws or returns violations).
- `let l = emptyLedger(); const r = l.apply(entry); if (!r.result.ok) ...; l = r.ledger;`
- After N applies: `l.balance(acct, asOf?, curr?)`, `l.verifyFundamentalEquation()`, `l.auditHash()`, `l.trialBalance()`.
- For multi-currency: explicit FX legs via createFxConversion or two entries.
- Attach citations from /ledger-cite when rates/policy/recognition involved.
- Always emit Canonical Financial Artifact (scope, assumptions[], citations[], kernelPlan referencing the primitives, proof, reproducibility/seed) for any non-trivial construct.

---

## PHASE 0: BOOTSTRAP & PROVE CANONICAL (DO NOT SKIP — RUN TESTS BEFORE ANY ANALYSIS)

1. Identify primary language(s) of monetary code in the target.
2. If TypeScript/JavaScript and `ledger` package is present:
   - Import from 'ledger' (or 'ledger/core').
   - Run the host's `npm test` or the determinism verify if present.
   - Confirm VERSION and that Money.from rejects non-int float (write one-liner test).
3. If Python (or no canonical present):
   - Copy `reference-implementations/python/ledger/` into the workspace as `ledger/` (or `python/ledger_reference/`).
   - `python -m pytest .../tests/` or run `python .../tests/test_canonical.py`.
   - Execute the trace_example.
   - Prove roundtrip: build entries → to_json → from_json → re-apply → identical hash + equation.
4. For any other language: create the mirror. Minimum surface: Money, Account, JournalEntry/validate, Ledger (apply+balances+equation+hash), verify_determinism. Add a `test_canonical` that the protocol's ENFORCER block will require.
5. Define the minimal Account chart for the domain (CASH, INVENTORY_*, REVENUE, FEE_EXPENSE, REALIZED_PNL, UNREALIZED, RISK_RESERVE, GRID_PNL or equivalent — name after subject's concepts). Put in `ledger/accounts.py` or `domain_accounts.ts`.
6. Write a 10-line smoke: create two capital entries, apply, print balances + equation + hash. Capture output.
7. Only advance when the canonical under test produces green determinism + equation on at least one realistic sequence.

**Artifact (committed or in audit_artifacts/):** `canonical_smoke.log`, the copied/adapted `ledger/` dir with its own tests.

**Rule:** The rest of the audit is performed by constructing entries with this canonical and replaying through Ledger. Not by describing the subject's code in English.

---

## PHASE 1: EXHAUSTIVE MONETARY INVENTORY (NO EXPRESSION LEFT BEHIND)

Write (or adapt) a scanner:
- For Python targets: use `ast` + `tokenize` + filename walk. Detect:
  - `float(`, `0.0`, bare `0.` near price/quantity/pnl/fee/capital/value/cost/usd/equity/atr/risk.
  - Binary ops `* / + -` whose operands have monetary names or come from `.value`, market data, DB rows, np/pandas.
  - Accumulators (`total +=`, `equity_curve.append`, `daily_pnl +=`, `peak = max(peak, ...)`).
  - Comparisons (`>=`, `> 0`, `== 0`, `0.99` hacks) on monetary identifiers.
  - DB schema (REAL, float columns), every cast on save/load, every DTO.
  - TA / numpy / indicator .value paths that flow into sizing or gates.
- For TS/JS: use ts-morph or simple regex + `grep -r` with context + `tsx` walker. Same patterns + `parseFloat`, `Number(`.
- Output machine-readable `monetary_inventory.json` + human table (file:line, expr/snippet, classification, risk).

Classification taxonomy (use exactly):
- CALC (qty*price, proceeds-cost-fee, weighted avg, allocation, MTM)
- ACCUM (equity curve, daily_pnl, total_fees, grid_profit)
- DECISION (if x > risk_budget * 0.01, is_full_exit = filled >= sell*0.99, gate)
- STORAGE (DB column, entity field, in-memory state)
- TRANSPORT (DTO, API response, WS emit, MarketContext passed to AI)
- BOUNDARY (exchange fill parsing, adapter return, float(md.last.value))
- SIGNAL (ATR, vol, indicator feeding monetary decision)

Special passes:
- All `.value` derefs followed by arithmetic.
- All fallback `except: return 0.0` or `or 0`.
- Restart/reload paths (daily_pnl = load_from_real(), peak restore).
- Every place two "books" (main FIFO vs grid vs risk vs backtest equity) diverge in representation.

Run scanner. Then do manual double-check pass with grep -B2 -A2 on top 30 hits. Add any missed.

**Artifact:** `monetary_inventory.json` (array of {file, line, expr, class, risk, snippet}), `inventory_report.md` (ranked table), at least 120 items.

---

## PHASE 2: FULL END-TO-END KERNEL-POWERED MONEY LIFECYCLE TRACES (THE HEART)

For every critical flow, reconstruct the complete money dataflow as a sequence of validated JournalEntries, then replay it on a fresh Ledger with step checkpoints.

Minimum traces (adapt names to subject; do all that exist + any additional high-risk):
1. Primary value-in (capital / deposit / funding) → first position or inventory update.
2. Buy / open fill lifecycle (decision → sizing → order → fill → fee recording → position add → trade persist → portfolio recalc → risk state).
3. Partial exit / reduce (the classic weak path).
4. Full exit + realized PnL + fee inclusion + inventory reduction.
5. MTM / unrealized update loop (mark-to-market on quote change).
6. Equity / NAV accumulation and drawdown path (backtester or live curve).
7. Signal contamination path: Indicator/TA value → risk budget / distance → qty computation → entry sizing money movement.
8. Multi-book reconciliation (main + grid + risk daily_pnl + external balance).
9. Restart / reload path (state from DB/REAL → reconstructed entries → balances match reported).
10. Any fee tier / rebate / funding / borrow path.

For **each** trace:
- Use realistic adversarial numbers (many decimals, repeating, tiny fees, borderline quantities that would trigger 0.99 hacks or 1e-12 excess logic).
- At every step:
  - Identify the exact expression(s) in subject code.
  - Build exact Money values.
  - Create balanced (or compound validated) JournalEntry (attach provenance like "fill:123@price").
  - `newL, res = ledger.apply(entry); assert res.ok; ledger = newL`
  - Snapshot: balances of affected accounts, current equation result, current audit_hash prefix.
  - Compute what the subject's ad-hoc/float path produces on identical inputs (write a small "subject_sim" function or copy the expressions).
  - Diff at that step (and cumulative).
- Highlight irreversible loss points (cast to float, DB write of REAL, np.array, bare arithmetic before any Money).
- At end of trace: final reconstructed vs subject-reported value. Decision impact (would a gate have passed/failed? qty different? "full exit" flag flip?).

**Artifacts (mandatory):**
- One runnable script per trace (e.g. `audit_artifacts/trace_buy_fill.py`, `trace_partial_exit.ts`).
- Each script must be self-contained, take seed/inputs, print step table + final proof.
- `traces_summary.md` collating all deltas + decision impacts.
- All scripts executed during the session; stdout captured in the report.

**Rule:** If you cannot turn a money movement described in the subject into a sequence of create+apply that produces the same economic result under the kernel, that movement is flagged as "not expressible in canonical" (high severity).

---

## PHASE 3: PRECISION, ACCUMULATION, METRICS & DRIFT FORENSICS (USE SIMULATOR)

Build or extend `ledger/simulator.py` (or .ts):
- `simulate_float_vs_canonical(scenario: list[dict], seeds: list[int])` — replay N small trades, repeated MTM, fee subtractions, partials, equity appends.
- Generate evil sequences: many tiny fees, prices with 8-12 decimals, 0.1 bp moves, 5000+ step equity curves.
- Metrics to attack: equity final, realized total, max drawdown calc, Sharpe (if subject computes it), position cost basis after 100 partials, risk % sizing after drift.
- Report: max absolute drift, drift as % of notional, step at which it exceeded 1 cent / 1 bp / decision threshold, whether equation would have caught it (it won't if subject never builds the entries).

Run:
- 1 000 trade Monte Carlo (multiple seeds).
- Long accumulation (one equity curve of 2 000+ bars).
- Specific "evil number" cases (e.g. 0.1 + 0.2 style, or 1/3 * 3 repeated).

Also target:
- Any 0.999 / 0.99 / 1e-8 / 1e-12 magic constants used as guards.
- Weighted average cost with ratio adjustments for partials.
- Loops that do `for lot in lots: basis += lot.qty * lot.price + fee*ratio`.

**Artifacts:** `precision_drift_report.md` (tables + thresholds crossed), simulator scripts + their execution logs, JSON of worst-case deltas.

---

## PHASE 4: INVARIANTS, RECONCILIATION, MULTIPLE BOOKS

Define (and prove via kernel) subject-specific invariants beyond the fundamental equation:
- Exchange-reported total == canonical cash + sum(current market value of inventory positions) (within documented tolerance using Money, not float).
- Sum of all realized (from exits) + unrealized (current basis vs mark) + fees paid == delta portfolio value.
- Grid (or sub-strategy) profit bucket is fully explainable as a set of balanced entries from the same trade history.
- Risk daily_pnl + peak state is reconstructible from journal + produces same gates.
- Backtester final equity + all metrics are reproducible from a deterministic replay of the fill stream as entries.

Implementation:
- Write `reconcile_portfolio(snapshot_dict, open_positions, cash) -> list[JournalEntry]`
- Write `reconcile_trade_history(trades) -> Ledger`
- Apply the reconstructed entries. Compare final balances to subject-reported numbers.
- Feed corrupted data (mismatched fees, partial DB, negative, dust) and see what survives.

Flag every place where subject trusts a secondary book without a cross-check that can be expressed as Ledger reconciliation.

**Artifacts:** reconciliation scripts + pass/fail results on real + adversarial data, proposed `reconcile_and_assert()` hook code for the subject.

---

## PHASE 5: SIGNAL LAYER + EXTERNAL CONTAMINATION

Map every place a non-kernel value (numpy float, TA indicator, pandas, exchange ticker as float, LLM output) becomes a monetary quantity or decision input:
- Trace from indicator.value → risk_budget = capital * pct → distance = atr * mult → qty = risk_budget / distance → entry Money.
- Show numeric sensitivity: 1e-9 or 1e-10 change in ATR (or vol) that flips accept/reject or changes qty enough to matter after fees.
- Any place market data (even if originally Decimal) is immediately cast before Money.

**Artifact:** contamination_map.md + at least two numeric examples where tiny signal error produces >1bp or decision change when modeled exactly.

---

## PHASE 6: BOUNDARIES, PERSISTENCE, STATE, TRANSPORT

For every boundary:
- Exchange adapters / ccxt / REST / WS: every price, qty, fee, balance returned → when it becomes float/Money.
- Fill handlers: estimate vs actual fee, partial fill math, casts on exec_price / filled_qty.
- Persistence: every CREATE TABLE / column type (REAL/float), every INSERT cast, every SELECT + float(), every ORM mapping.
- DTOs / schemas / API responses / dashboard / WS payloads / prompt context for AI.
- In-memory mutation ( `_daily_pnl += x`, peaks, running totals in risk manager).
- Serialization roundtrips (JSON, pickle, DB).

For each: exact cast sites + recommendation for "internal canonical only; convert at the edge with provenance tag".

**Artifacts:** boundary_cast_inventory (subset of monetary_inventory), hardened conversion functions (e.g. `money_from_exchange(raw, 'USD', provenance='kraken-fill-123')`).

---

## PHASE 7: TESTS, FALLBACKS, DETERMINISM, ERROR PATHS, EDGES

Audit the subject's test suite:
- Any test using `approx()`, `pytest.approx`, `np.isclose`, `math.isclose`, or bare `==` on money-derived values without Money.
- Fallbacks: cost basis 0.0 on error, fee estimate on missing, etc. — construct the exact sequence that would trigger the fallback and show downstream decision corruption.
- Restart determinism: load state from persisted floats → replay same operations → compare to fresh path.
- Edge cases the subject claims to handle: zero qty, dust, stablecoin cross trades, very high/low prices, 1000 partial fills on one position, negative prices (some venues), overflow.

Write new adversarial tests that use the canonical and would have caught the issues.

**Artifacts:** gap_analysis.md, new test patches or standalone `adversarial_test_*.py`.

---

## PHASE 8: ADVERSARIAL ATTACKS & FUZZ (RAMBO MODE)

Write `fuzzer.py` / `attack_generator.py`:
- Sequences designed to maximize float accumulation error (alternating tiny buys/sells, repeated add of 0.00000001 fees, prices with long decimals).
- Inputs where `if filled >= target * 0.99` or `excess > 1e-12` would behave differently under exact vs float.
- DB roundtrip that makes FIFO cost basis differ enough to change "was this profitable?".
- Grid profit attribution vs main journal after restart.
- "Kraken returned slightly different fee" simulation.
- Run subject's backtest/optimize paths (or equivalent) on clean vs drifted equity curves and show param recommendation changes.

Execute at least 3 distinct attack families. Document triggers and impacts.

**Artifacts:** fuzzer code + execution summaries + "this input caused X decision to flip".

---

## PHASE 9: SYNTHESIS, RANKED FINDINGS, ENFORCEMENT DELIVERABLES + SELF-ATTACK

Produce `LEDGER_SUPER_AUDIT_REPORT.md` (and .json) with mandatory sections (no omissions):

1. Executive summary + "Would the books balance under the canonical Ledger constructed during this audit?" (YES/NO + one-sentence proof referencing the recon + sample hashes).
2. Quantitative summary (expressions analyzed count, counterexamples with exact deltas, scripts produced+executed, traces modeled, attacks run).
3. Severity-ranked findings (L-HIGH / L-MED / L-LOW / L-INFO). For each:
   - Precise locations (file:line ranges + 4-6 lines of context).
   - Exact violating expression(s).
   - Concrete numeric counterexample: inputs → subject's result → canonical result → delta → "this caused / would cause <wrong decision or drift>".
   - Hardened kernel version (the exact createEntry + apply snippet).
   - Full suggested diff or new function that uses the canonical.
   - Why previous audits (surface Money.from greps or manual reads) missed it.
4. All lifecycle traces (links or embedded summaries + key deltas).
5. Precision & accumulation forensics + simulator logs.
6. Contamination map + signal impact numbers.
7. Multi-book / reconciliation gaps + attempted postings (success/fail + hashes).
8. Adversarial results.
9. The complete canonical used (or reference to it) + integration instructions ("import ledger; replace all amount math with Money.from + post every value movement as balanced entry + assert equation after critical sections").
10. Runtime / CI enforcement recommendations (scanner in pre-commit, reconcile hook on every fill, determinism gate on backtest results, etc.).
11. Hardened next version of this protocol (lessons learned in this execution).

**Mandatory Self-Attack Pass (before final report):**
- Re-run your scanners and simulators against the "fixed" code you proposed in findings.
- Search for 2-3 additional monetary expressions or accumulations you missed on first pass.
- Add "Meta-findings: Weaknesses in this audit execution" section (intellectual honesty).
- Re-execute key numeric simulations with your proposed canonical model applied in the sim and prove drift is eliminated or bounded.
- Confirm the canonical you built/used itself roundtrips a full realistic trade history without violating its own invariants.

---

## PHASE 10: DELIVERABLES + ENFORCER VERIFICATION (MANDATORY CLOSING)

You must leave behind (at minimum):

- Working canonical for the target's language (if it did not exist) + its tests + proof it was used.
- `monetary_inventory.json` + human report.
- >=6 runnable trace scripts with captured outputs.
- Simulator + drift report + logs.
- Reconciliation scripts + results on real/adversarial data.
- Fuzzer/attack scripts + outputs.
- Full `LEDGER_SUPER_AUDIT_REPORT.md` (evidence-dense, every sentence backed).
- Any patches or new enforcement modules.
- Updated / hardened version of this protocol (v3.1) if execution revealed gaps.
- The ENFORCER VERIFICATION block (exact format below) filled truthfully.

**ENFORCER VERIFICATION — SUPER LEDGER AUDIT**

```
Session completed on: [YYYY-MM-DD]
Target repository: [name / path] (language: [ ])

Quantitative bar met?
[x] >=120 distinct monetary expressions catalogued + operated on via scanner + manual
[x] >=8 concrete numeric counterexamples with deltas and decision impact
[x] >=6 full kernel-powered numeric lifecycle traces (runnable scripts + outputs)
[x] Canonical (native or reference port) built/imported, tested with determinism+equation, and used for 100% of modeling/proofs
[x] Every trace step used create_* + validate + Ledger.apply + snapshot + equation + hash
[x] Signal/TA contamination fully mapped with numeric sensitivity
[x] All high-risk hotspots (from inventory + known patterns) re-verified with code execution
[x] Adversarial fuzzer/attacks executed + results captured
[x] Reconciliation attempted against canonical Ledger on subject data (passes/fails shown with hashes)
[x] Self-attack / meta review performed; additional misses surfaced and documented
[x] Previous audit shallowness addressed (expression-level + numeric proof + kernel replay, not pattern grep)
[x] Plan followed with zero phase skips; tools (write/run/grep) used for heavy lifting, not just reading

Evidence locations:
- Canonical: reference-implementations/python/ledger/ (or native) + smoke + tests
- Inventory: monetary_inventory.json + inventory_report.md
- Traces: audit_artifacts/trace_*.*
- Report: LEDGER_SUPER_AUDIT_REPORT.md
- Scripts: ...
- Hashes from successful equation proofs: ...

Would the books balance under the canonical kernel constructed/replayed in this audit? [YES/NO — one sentence with proof]
Confidence this execution is "full standard deviation higher than handwavy audit": XX/100
Super Financial Enforcer achieved: [YES/NO — artifacts + depth + kernel usage prove it]

If any checkbox is not [x], this execution is incomplete. Explain required extra pass.
```

**Final instruction:** After verification, the workspace must contain the canonical + runnable enforcement tools so the next human or agent can immediately do `from ledger.money import Money; ...` (or TS equiv) and start posting real balanced entries for the target's flows. The audit is not words — it is permanent infrastructure + proof that the invariants were actually exercised.

---

## APPENDIX A: COMMON ANTI-PATTERNS (ABSTRACTED — APPLY TO ANY REPO)

- Ad-hoc arithmetic for "cost basis", "realized PnL", "equity" using float or unscaled Decimal.
- Multiple uncoordinated stores of truth (trade log, grid orders, risk daily_pnl, backtest equity_curve) without a single journal that can reconcile all.
- Casting at every boundary and "fixing later with 1e-8 tolerances".
- Using indicator / TA / ML outputs directly in money math without provenance and exact path.
- Restart logic that reloads floats and trusts them.
- Sizing / risk gates driven by drifted portfolio_value.
- Tests that only assert "approximately correct".
- "Performance" choice of float that was never measured against the cost of silent wrong decisions.

Replace every one of the above with kernel modeling + numeric proof in the traces.

---

## APPENDIX B: MINIMAL SCANNER STARTER (PYTHON EXAMPLE — ADAPT FOR TARGET LANG)

```python
# audit_artifacts/scanner.py
import ast, pathlib, json, re
from collections import defaultdict

MONEY_NAMES = re.compile(r'(price|qty|quantity|amount|pnl|fee|capital|value|cost|usd|equity|atr|risk|gross|net|proceeds|basis)', re.I)

def scan(path: str):
    inv = []
    for py in pathlib.Path(path).rglob('*.py'):
        if 'ledger' in str(py) or 'test' in str(py): continue  # skip our stuff
        try:
            tree = ast.parse(py.read_text())
            for node in ast.walk(tree):
                # ... (full impl would catch Assign, BinOp, Call to float, Name matches, etc.)
                pass
        except: pass
    # output json + counts
    print(json.dumps(inv, indent=2))
```

In every audit you write the real scanner for the language and run it.

---

**End of Protocol v3.0. Paste verbatim. Execute without mercy. Double-Entry or Get Beta.**

*This protocol combines the zero-skip adversarial density of prior hardened plans with mandatory deep use of the actual Ledger kernel for transaction replay, balance proofs, determinism, and numeric counter-example generation. It is deliberately copy-paste executable and artifact-heavy so that "the audit" produces enforceable infrastructure rather than opinions.*
