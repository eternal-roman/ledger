---
name: ledger-sim
description: >
  Execute deterministic financial scenarios or simulations. Requires explicit seed for any stochastic elements, full trace of assumptions, and proof of all invariants via the kernel. Use for "run sim", "deterministic projection", "ledger-sim", or /ledger-sim.
license: MIT
---

# ledger-sim

Run scenario using only core (Money, JournalEntry, Ledger):
- Explicit assumptions (date, rates, jurisdiction, sources) + citations.
- Seed stochastic elements; log seed.
- Per step: build/validate/apply/prove equation. Capture balances + auditHash at checkpoints (see runTrace in src/verify).
- Output trace + final balances + proof + reproducibility hash.
- "Deterministic replay hash: ..."

For audits: sims can feed numeric side-by-side comparison and drift analysis when modeling flows with the kernel.

Attach citations for policy/recognition.

Invalid if non-deterministic or unprovable. Use for full lifecycle modeling in /ledger-audit.