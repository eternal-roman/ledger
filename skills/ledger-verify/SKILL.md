---
name: ledger-verify
description: >
  Run strict ledger verification on a diff, file, or snippet. Enforces Money.from for all amounts, proper JournalEntry construction, validateEntry / Ledger.apply calls, balance proof, and required canon citations. Use when user asks to "ledger-verify", "verify this financially", "check for floats or unbalanced entries", or invokes /ledger-verify. Reports violations with proof.
license: MIT
---

# ledger-verify

Verify the current diff, file, or snippet against ledger invariants.

The agent must:
1. Parse for any monetary amounts and force `Money.from(...)` usage (from 'ledger' or 'ledger/core').
2. Construct JournalEntry(s) where transactions or values appear.
3. Call `validateEntry` and/or `Ledger.apply` and report the result.
4. Flag any violations with exact proof (unbalanced lines, float usage, missing citations, mutation).
5. Surface canon context or knowledge graph citations if rates, policy, or recognition rules apply.

Output format: location + issue + required fix (e.g. "L12: float: use Money.from(100, 'USD') instead of 100. Report balance status and whether invariants hold.

Never allow an unverified or unbalanced financial state to pass. If clean: "Ledger clean. Invariants hold."

Boundaries: financial structure and value integrity only. "stop ledger-verify" to revert.

## Plugin Composition
- Run inside superpowers verification phase or after test-driven-development.
- Follow with pr-review-toolkit `silent-failure-hunter` and `pr-test-analyzer`.
- Use before any commit or PR involving value code.