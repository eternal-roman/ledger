---
name: ledger-audit
description: >
  Whole-repo audit that enforces use of the ledger kernel for monetary logic.
  Requires expressing value flows using Money.from, JournalEntry, validateEntry, and Ledger.apply
  (or runTrace). Discovers non-kernel monetary expressions via scanning, then models critical paths
  as kernel sequences with proofs. Use for "ledger-audit", "financial audit", "/ledger-audit".
license: MIT
---

# ledger-audit

Perform a rigorous audit that ensures monetary code is (or can be) expressed using the ledger kernel primitives.

## Core Requirements
- Use the kernel for all value: `Money.from(...)`, `JournalEntry` / `createEntry` / `validateEntry`, `Ledger` + `apply`.
- For code that does not yet use the kernel, reconstruct the actual money movements as balanced `JournalEntry` sequences.
- Replay those sequences using `Ledger.apply` (or the `runTrace` helper from `ledger/verify`).
- At each step prove: balances, `verifyFundamentalEquation()`, `auditHash()`.
- Emit a `CanonicalFinancialArtifact` (scope, assumptions, citations, kernelPlan, proof, reproducibility) for significant constructs.
- Use the shipped reference canonicals when the target language does not yet integrate the kernel.

## Process
1. **Canonical bootstrap** (if needed):
   - For TypeScript/JavaScript targets: use the `ledger` package.
   - For Python targets: use `reference-implementations/python/ledger/`.
   - For other languages: implement a faithful mirror that passes the determinism + equation tests.
   - Prove it works before modeling target flows.

2. **Discover monetary expressions**:
   - Use static analysis / grep / AST scanning (the `scripts/ledger-audit-inventory.ts` or equivalent Python scanner in the ref can help) to locate sites that create, transform, store, or decide on monetary values (including hidden float paths, accumulators, boundary casts).
   - Classify them (calculation, storage, decision, boundary, etc.).

3. **Kernel modeling of critical paths**:
   - Identify the important money lifecycles (fills, fees, PnL, valuation, risk sizing, etc.).
   - Rebuild them as sequences of `JournalEntry` using the kernel.
   - Replay step-by-step with `Ledger.apply` or the `runTrace` helper.
   - Capture per-step state and proofs.
   - For common domains (e.g. fills), use helpers like `reconcile_buy_fill` from the Python ref or equivalent.
   - Where the original code uses non-kernel arithmetic, compute both paths on the same inputs and show deltas + decision impact.

4. **Proof and reconciliation**:
   - Use `runTrace`, `verifyDeterminism`, `validateEntry`, and `Ledger` methods.
   - Reconcile multiple books / external state against the kernel ledger.
   - Produce runnable artifacts that demonstrate the proofs.

5. **Findings**:
   - For each issue: exact location + expression, numeric counter-example (original vs kernel), suggested kernel version using the primitives, and impact.

The audit passes when critical flows are either already using the kernel correctly or have been modeled + proven with it, and non-kernel usage is explicitly justified or replaced.

Complements `/ledger-verify` (for changes) and `/ledger-review`.

If host verification layers (TDD, pr-review-toolkit equivalents, security) are present, run them after the kernel checks. Otherwise note "Ledger kernel layer only".