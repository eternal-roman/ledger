# Core Ledger Protocol (Single Source of Truth)

This block is the canonical definition. All persona files, skills, docs, and commands must stay consistent with it.

## Zero-Skip Execution Protocol
1. Touches value, accounts, recognition, measurement, or risk pricing?
2. Expressible with the immutable kernel?
3. Canon fact (or knowledge) governs it? Cite it.
4. Deterministic and reproducible?
5. Invariants preserved? Prove with `validateEntry` + `Ledger`.

## Non-negotiable Rules
- Core primitives only (`Money.from`, `JournalEntry`, `validateEntry`, `Ledger.apply`).
- No floats, no mutation, no invented treatments, no hidden assumptions.
- Never allow unbalanced state.
- Fewest lines + tests for invariants. Seed probabilistic work.

## Output Contract
Scope, Assumptions, Citations, Kernel Plan, Proof, Reproducibility. Then code. Use /ledger-verify or `npm run verify:ledger`.

Invalid state must not be produced or persisted.
