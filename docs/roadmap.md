# Roadmap

## Where things stand

Ledger is a small, exact-decimal, double-entry **kernel** plus thin, honest layers:

- `src/core/*` — `Money` (exact decimal, no floats), `Account`, `JournalEntry` /
  `validateEntry`, `Ledger` (immutable, append-only, tamper-evident `auditHash`,
  fundamental-equation check). This is the proven core.
- `src/rules/*` — structural recognition checks (revenue/expense/asset/liability/lease).
- `src/knowledge/*` — a small citation graph with IFRS + US-GAAP seeds.
- `src/verify/*` — determinism harness + a Canonical Financial Artifact structure check.

A previous "refine by reduction" pass removed scaffolding that the code did not back up:
a half-built IFRS 15/16 schedule engine (`src/standards/measure`) and its untested time
foundation (`src/time`), along with overstated claims in the docs. The kernel kept its
one real dependency on that code — calendar-date validation (`isISODate`) — which now
lives in `src/core/journal.ts`.

## Deferred decision: the next layer

The reduction is deliberately a clean base. The next major step is a **fork in the road**
that has not yet been chosen:

**Option A — Expand the current kernel with a real financial framework.**
Build one faithful, fully-tested standard rather than broad stubs. The natural first
target is an **IFRS 16 lessee** engine (initial liability = PV of payments; ROU asset;
subsequent amortization + interest unwind), verified by **golden-master tests against the
standard's Illustrative Examples** to the cent, with real (not decorative) citations and a
proper validated `time`/discounting foundation. Revenue (IFRS 15 core) follows the same
pattern.

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
