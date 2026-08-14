---
name: ledger-core
description: >
  Kernel-only enforcement for monetary code. Use when writing or reviewing Money.from,
  JournalEntry, validateEntry, Ledger.apply, or when you see parseFloat / native number
  amounts. Zero-Skip + Canonical Financial Artifact. Prefer this in libraries that
  depend on @eternal-roman/ledger without the full plugin.
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
Scope, Assumptions, Citations, Kernel Plan, Proof, Reproducibility, AuditHash. Then code. Use the shipped `scripts/ledger-verify.ts` (or `npm run verify:ledger`) or /ledger-verify when available.

See `docs/CORE-PROTOCOL.md`, `AGENTS.md`, and the kernel implementation (`src/core`, `src/verify`).

Always run the ledger layer. Note when only the ledger layer is present.
