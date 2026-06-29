# Roadmap

## Where things stand

Ledger provides a focused exact-decimal, double-entry **kernel** plus thin, honest layers:

- `src/core/*` — `Money` (exact decimal, no floats), `Account`, `JournalEntry` /
  `validateEntry`, `Ledger` (immutable, append-only, tamper-evident `auditHash`,
  fundamental-equation check). This is the kernel.
- `src/rules/*` — structural recognition checks (revenue/expense/asset/liability/lease).
- `src/knowledge/*` — a small citation graph with IFRS + US-GAAP seeds.
- `src/verify/*` — determinism harness + a Canonical Financial Artifact structure check.

A previous "refine by reduction" pass removed scaffolding that the code did not back up:
a half-built IFRS 15/16 schedule engine (`src/standards/measure`) and its untested time
foundation (`src/time`), along with overstated claims in the docs. The kernel kept its
one real dependency on that code — calendar-date validation (`isISODate`) — which now
lives in `src/core/journal.ts`.

IFRS 16 (lessee) has been implemented as a faithful, golden-master verified standard.
Additional production utilities (period locks/hard close, closing/RE engine, FX translation
+ CTA, general straight-line and declining depreciation schedules) have been added
following the same rigorous pattern: exact `Money` + kernel factories only, determinism,
equation proofs, citations.

## Current state and extensions

The kernel + standards layer now provides focused support for common production needs
(period controls, closing, multi-curr reporting translation, asset schedules) while
staying small and enforcing invariants at the boundary. No broad stubs. 

Future work (e.g. IFRS 15 revenue) can follow the same "one faithful implementation"
approach.

**Option B — Build a purpose-built alternative kernel.**
If a specific use case (e.g. a bank ledger, a tax engine, a portfolio/valuation tool)
needs a different shape, stand up a separate kernel tuned to that purpose instead of
generalizing the accounting kernel.

### Decision criteria
- Is there a concrete target use case that the accounting kernel models well? → **A**.
- Does the target need primitives the double-entry kernel does not? → **B**.

Whichever path is taken, the non-negotiables hold: exact decimal only, determinism,
real citations (no theater), every generated entry passes `validateEntry`, and every
computation is covered by tests — golden-master where a published standard exists.
