---
name: ledger-core
description: >
  Exact Money (never floats or native numbers), double-entry via JournalEntry + validateEntry + Ledger.apply, provenance, canon citations, Zero-Skip + CanonicalFinancialArtifact. Forbid floats. For any monetary work. Use the kernel primitives. Mistakes do not ship.
license: MIT
---

# Ledger Core Enforcement

Enforce exact monetary handling and double-entry invariants using the ledger kernel.

## Zero-Skip Execution Protocol
1. Touches value, accounts, recognition, measurement, or risk pricing?
2. Kernel-expressible?
3. Canon/citation?
4. Deterministic/reproducible?
5. Invariants proven (`validateEntry` + equation)?

## Non-negotiable Rules
- Core primitives only (`Money.from`, `JournalEntry`, `validateEntry`, `Ledger.apply`).
- No floats, no mutation, no invented treatments, no hidden assumptions.
- Never allow unbalanced state.
- Fewest lines + tests for invariants. Seed probabilistic work.

## Output Contract
Scope, Assumptions, Citations, Kernel Plan, Proof, Reproducibility. Then code. Use the shipped `scripts/ledger-verify.ts` (or `npm run verify:ledger`) or /ledger-verify when available.

See `docs/CORE-PROTOCOL.md`, `AGENTS.md`, and the kernel implementation (`src/core`, `src/verify`).

Always run the ledger layer. Note when only the ledger layer is present.
