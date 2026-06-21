---
name: ledger-sim
description: >
  Execute deterministic financial scenarios or simulations. Requires explicit seed for any stochastic elements, full trace of assumptions, and proof of all invariants via the kernel. Use for "run sim", "deterministic projection", "ledger-sim", or /ledger-sim.
license: MIT
---

# ledger-sim

Run the requested scenario:
- Use only ledger core for all values and state (Money, JournalEntry, Ledger).
- Make every assumption explicit (date, rates, jurisdiction, sources).
- Seed any random/probabilistic elements; log the seed.
- For every step: construct entries, validate, apply, prove equation.
- Output full trace (inputs, steps, final balances) + proof artifacts.
- End with "Deterministic replay hash: ... " or equivalent.

If the scenario touches policy or recognition, fetch and attach citations.

Non-deterministic or unprovable results are invalid. "stop ledger-sim" reverts.