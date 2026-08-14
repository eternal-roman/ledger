---
name: ledger-verify
description: >
  Verify a diff, file, or snippet against ledger invariants. Use when asked to
  ledger-verify, check for floats, find unbalanced entries, prove a journal,
  or before committing money code. Enforces Money.from, validateEntry, Ledger.apply,
  citations. CLI: npx ledger-verify --scan .
license: MIT
---

# ledger-verify

Verify the current diff, file, or snippet against ledger invariants.

The agent must:
1. Parse for any monetary amounts and force `Money.from(...)` usage (from '@eternal-roman/ledger' or '@eternal-roman/ledger/core').
2. Construct JournalEntry(s) where transactions or values appear.
3. Call `validateEntry` and/or `Ledger.apply` and report the result.
4. Flag any violations with exact proof (unbalanced lines, float usage, missing citations, mutation).
5. Surface canon context or knowledge graph citations if rates, policy, or recognition rules apply.

Output: location + issue + fix (e.g. "L12: float — use Money.from(100, 'USD')"). Report balance + invariant status.

Never allow an unverified or unbalanced financial state to pass. If clean: "Ledger clean. Invariants hold."

Boundaries: financial structure and value integrity only. "stop ledger-verify" to revert.

## Plugin Composition
- Run inside host verification phase (e.g. superpowers or equivalent TDD/verification step) when available, or after tests.
- Follow with host review agents (pr-review-toolkit equivalents: silent-failure-hunter, pr-test-analyzer) when present.
- Use before any commit or PR involving value code.
- If no host verification layer is detected, still perform full ledger check and note that only the ledger layer ran.