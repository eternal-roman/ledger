# IFRS 15 / IFRS 16 Standards Engine — Scope & Design

- **Status:** Approved scope (umbrella). Each module ships as its own spec → plan → implementation cycle.
- **Date:** 2026-06-21
- **Owner:** Ledger (The Bean Counter)
- **Builds on:** the hardened kernel (`Money`, `JournalEntry`/`validateEntry`, `Ledger`, `FXRate`, tamper-evident `auditHash`) as of v0.4.4.

---

## 1. Goal

Provide an authoritative, deterministic engine that **computes the canonical accounting schedules** for IFRS 15 (Revenue from Contracts with Customers) and IFRS 16 (Leases), and **reconciles posted journal entries** against those schedules within tolerance. Every computed number cites the governing standard paragraph and is reproducible to the penny against the standards' official Illustrative Examples.

This is the "full" engine: IFRS 15 + IFRS 16 **lessee and lessor**, **including** modifications and remeasurements.

### Operating model — Hybrid

```
Contract/Lease inputs ──▶ [ Measurement core ] ──▶ Schedule (immutable, hashable)
                                                      │
                                                      ├─▶ suggested JournalEntry[] (validated by kernel)
                                                      │
Posted JournalEntry[] ─────────────────────────────▶ [ Reconciler ] ──▶ match / variance report
```

- The engine **generates** the schedules (and optionally the suggested entries).
- The engine **validates** that externally-posted entries match the generated schedule within **one minor currency unit** per posting (reusing the FX-consistency tolerance approach already in `createFxConversion`).

---

## 2. Non-negotiable principles

1. **Exact decimal only.** All measurement uses `Money`/`Decimal`; no floats. Discount factors and rates are exact decimals with an explicit, documented rounding policy per computation.
2. **Determinism.** Same inputs ⇒ identical schedule ⇒ identical `auditHash`. No clocks, no locale, no map-iteration-order dependence.
3. **Citations everywhere.** Every schedule line and recognition event carries the governing paragraph reference (e.g., `IFRS 16.26`, `IFRS 15.31`) sourced from the knowledge graph.
4. **Inputs are explicit and sourced.** Discount rates (rate implicit in the lease / incremental borrowing rate), standalone selling prices (SSP), and variable-consideration estimates are **inputs with provenance**, never guessed.
5. **Kernel is the floor.** Generated entries pass `validateEntry` (balance, positive at-scale amounts, ISO dates, single currency per entry) and post through `Ledger.apply`.
6. **Fail closed.** Ambiguous classification, missing rate, or unreconcilable posting raises an explicit violation — never a silent default.

---

## 3. Architecture

New code lives **above** the kernel; the kernel stays pure.

```
src/
  core/         (existing kernel — unchanged contract)
  time/         NEW — real dates, periods, day-count, discounting
  standards/
    measure/    NEW — schedule model + shared measurement primitives
    ifrs16/     NEW — leases (lessee + lessor)
    ifrs15/     NEW — revenue
    reconcile/  NEW — posted-vs-schedule reconciliation
  knowledge/    (existing — extend seeds with IFRS 15/16 paragraphs)
```

**Rejected alternatives:** growing `src/rules/` in place (it is validation-shaped, not measurement-shaped — would tangle computation with checks); a separate companion package (premature packaging overhead, splits the canon while it's still moving).

### 3.1 The foundational gap this closes

The engine needs real period/date arithmetic and discounting, but the kernel currently stores dates as unvalidated strings. **M0 introduces a real `time` module** (validated calendar dates, period generation, day-count) and migrates date handling onto it. This is deliberate: it retires the stringly-typed dates flagged in the prior audit (finding #8) and gives every later module a sound temporal basis.

---

## 4. Shared models (cross-module)

```ts
// src/time/
type DayCount = 'PER_PERIOD_EFFECTIVE' | 'ACT/365' | 'ACT/ACT' | '30/360';
interface Period { index: number; start: ISODate; end: ISODate; }
type Frequency = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | { everyMonths: number };
function periods(start: ISODate, end: ISODate, freq: Frequency): Period[];

// src/standards/measure/
interface ScheduleLine {
  period: Period;
  opening: Money;
  additions?: Money;     // e.g. interest accrued, revenue recognized
  reductions?: Money;    // e.g. payment, amortization
  closing: Money;
  citations: string[];
}
interface Schedule {
  kind: 'LEASE_LIABILITY'|'ROU_ASSET'|'LESSOR_NET_INVESTMENT'|'REVENUE'|'CONTRACT_BALANCE';
  currency: string;
  lines: readonly ScheduleLine[];
  inputsHash: string;    // hash of the inputs that produced it
  hash(): string;        // deterministic schedule hash
}
```

- `Schedule` is **immutable and hashable** — the unit of determinism and the thing the reconciler diffs against.
- A schedule can emit `toEntries(accounts): JournalEntry[]` (suggested postings), each kernel-validated.

---

## 5. Module decomposition & build order

Order: **M0 → M1 → M4 → M2 → M3 → M5.** M0 unblocks all; lessee (M1) and revenue-core (M4) deliver the most value first; remeasurement/modification depth (M2, M5) and lessor (M3) follow.

### M0 — Measurement & time core
- `time`: validated `ISODate`, period generation (monthly/quarterly/annual/custom), day-count conventions.
- Discounting: exact PV/FV, effective-interest amortization, present value of a payment stream.
- `Schedule` model + `toEntries`.
- Input model: `DiscountRate` (implicit vs IBR), `StandaloneSellingPrice`, with knowledge-graph provenance.
- **Acceptance:** PV of a known annuity matches a hand-computed golden value to the cent; schedules are reproducible (stable hash).

### M1 — IFRS 16 lessee: initial + routine *(IFRS 16.22–43)*
- `LeaseContract` input: payments (fixed, in-substance fixed, index/rate-linked initial level), term, options reasonably certain, residual value guarantees, discount rate, initial direct costs, incentives, dismantling estimate; short-term (≤12m) and low-value exemptions.
- Initial **lease liability** = PV of lease payments (IFRS 16.26–28). Initial **ROU asset** = liability + IDC + prepayments + dismantling − incentives (IFRS 16.23–24).
- Subsequent: **ROU amortization** (typically straight-line, IFRS 16.31) + **interest unwind** on the liability via effective interest (IFRS 16.36–38), to term end.
- Emit suggested entries per period; reconcile postings.
- **Acceptance:** reproduce the IFRS 16 Illustrative Example lessee schedule to the cent; equation holds each period.

### M2 — IFRS 16 lessee: remeasurement & modifications *(IFRS 16.39–46)*
- Reassessment triggers: revised term/options, RVG change, index/rate change. Apply correct rule: **revised discount rate** for term/rate/option changes vs **unchanged rate** for index/market-rate-driven payment changes (IFRS 16.40–43).
- Modifications: separate lease vs not (IFRS 16.44–46); decrease-in-scope gain/loss vs ROU adjustment.
- **Acceptance:** golden examples for each trigger type; before/after schedules reconcile.

### M3 — IFRS 16 lessor *(IFRS 16.61–97)*
- Classification: finance vs operating on risks-and-rewards indicators (IFRS 16.61–66).
- Finance lease: derecognize asset, recognize **net investment / lease receivable**, finance income schedule (IFRS 16.67–80).
- Operating lease: retain asset, recognize lease income (usually straight-line, IFRS 16.81–88).
- **Acceptance:** classification decision is explainable/cited; finance-income and operating-income schedules match golden examples.

### M4 — IFRS 15 core *(the 5-step model)*
- `Contract` + `PerformanceObligation` model.
- Step 1 identify contract (IFRS 15.9–16); Step 2 distinct POs (15.22–30); Step 3 transaction price — **fixed consideration only in M4** (15.47); Step 4 allocate by **relative SSP** incl. discount allocation (15.73–86); Step 5 recognize **point-in-time** vs **over-time** (output/input methods, %-complete) (15.31–45).
- Emit **contract asset/liability** and **revenue** entries; reconcile.
- **Acceptance:** reproduce IFRS 15 Illustrative Examples for allocation and over-time recognition to the cent.

### M5 — IFRS 15 advanced
- Variable consideration + constraint (expected value / most likely amount) (15.50–59).
- Significant financing component (discounting) (15.60–65).
- Contract modifications: separate contract / prospective / cumulative catch-up (15.18–21).
- Contract costs: capitalize incremental costs of obtaining + costs to fulfill, then amortize (15.91–104).
- **Acceptance:** golden examples per sub-topic; catch-up adjustments reconcile.

---

## 6. Reconciliation

`reconcile(schedule, postedEntries, { tolerance = oneMinorUnit })`:
- Maps each posted entry to the schedule period/event it claims to satisfy.
- Asserts amounts, accounts (by role), and signs match the schedule within tolerance.
- Returns a structured `{ ok, variances[] }`; a non-empty variance set is a fail-closed violation.

---

## 7. Determinism & testing strategy

- **Golden masters (headline):** encode the official Illustrative Examples from IFRS 15 and IFRS 16 as fixtures; assert generated schedules match to the cent. This is what makes the engine *authoritative*.
- **Property tests:** schedule invariants — liability amortizes to ~0 at term end; sum of recognized revenue equals allocated transaction price; ROU fully amortized at term end; every period's suggested entries are kernel-balanced.
- **Determinism harness:** build each schedule twice; assert identical `hash()` and identical emitted `auditHash`.
- **Citation coverage:** every schedule line carries ≥1 resolvable citation.
- All wired into `verify:full` and CI.

---

## 8. Scope boundary

**In v1:** IFRS 15 core + advanced (variable consideration, significant financing component, contract modifications, contract costs); IFRS 16 lessee (initial, routine, remeasurement, modifications) and lessor (finance + operating).

**Out of v1 (named v2+):** impairment of ROU / contract assets (IAS 36), sale-and-leaseback, sub-leases, principal-vs-agent, licensing/royalties, non-cash & consideration-payable-to-customer, portfolio practical expedients, and tax effects (extensible hooks only).

---

## 9. Defaults (decided)

- Period granularity **configurable, default monthly**.
- Day-count **configurable, default `PER_PERIOD_EFFECTIVE`** (period-rate effective interest).
- Discount rate (implicit/IBR) and SSP are **explicit inputs with provenance** — never inferred.
- Reconciliation tolerance: **one minor currency unit** per posting, configurable.
- Multi-currency leases/contracts reuse the existing `FXRate`/`Money.convert`.

---

## 10. Sequencing & milestones

| Milestone | Modules | Delivers |
|---|---|---|
| **MS-1 Foundations** | M0 | Time/period engine, discounting, schedule model, input+provenance |
| **MS-2 First value** | M1, M4 | Lessee schedules + revenue-core; golden examples green |
| **MS-3 Depth** | M2, M5 | Remeasurement/modifications (lease + revenue) |
| **MS-4 Completeness** | M3 | Lessor accounting; full v1 surface |

Each milestone is independently shippable and independently verifiable.

---

## 11. Risks & mitigations

- **Standards nuance / misinterpretation** → golden-master tests against official Illustrative Examples; cite every computation; keep measurement logic small and isolated per module.
- **Rounding divergence** → single documented rounding policy in `measure/`, applied uniformly; tolerance only at the reconciliation boundary.
- **Scope creep within a module** → strict module boundaries; v2 list is explicit; each module gets its own spec/plan.
- **Temporal correctness** → M0 replaces string dates with a validated calendar engine before any schedule logic is written.

---

## 12. Open questions

None blocking. Confirmed: hybrid model, lessee+lessor, modifications+remeasurements in scope, monthly-default configurable periods, v2 out-list as above.
