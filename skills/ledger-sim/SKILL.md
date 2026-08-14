---
name: ledger-sim
description: >
  Deterministic financial scenario. Use for ledger-sim, projection, forecast, or
  /ledger-sim. Requires an explicit seed, cited assumptions, and a kernel trace
  (runTrace) with auditHash at each checkpoint.
license: MIT
---

# ledger-sim

Seed + cited assumptions. Each step: build, validate, apply, prove equation. `runTrace`. Output: trace, balances, `auditHash`. Invalid if not replayable.
