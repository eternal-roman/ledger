---
name: ledger-sim
description: >
  Deterministic financial scenario. Use for ledger-sim, projection, forecast, or
  /ledger-sim. Requires an explicit seed, cited assumptions, and a kernel trace
  (runTrace) with auditHash at each checkpoint.
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