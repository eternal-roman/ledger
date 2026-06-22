---
name: ledger-review
description: >
  Full financial review combining ledger invariants (verify/audit), superpowers verification, pr-review-toolkit specialized agents (silent failures, types, tests), and security guidance. Use for "ledger-review this", "full review before PR", "run the complete bean counter review", or before shipping changes that touch money.
license: MIT
---

# ledger-review

Perform a complete, multi-layered review of financial code or changes.

## Steps (in order)
1. **Ledger core invariants**:
   - Run the equivalent of `/ledger-verify` (or whole `/ledger-audit` for broad scope).
   - Enforce Money.from, JournalEntry, validateEntry, Ledger.apply, balance + accounting equation, citations.
   - Produce Canonical Financial Artifact if not already present.

2. **Superpowers verification**:
   - Confirm test-driven-development was followed.
   - Check verification-before-completion artifacts.

3. **Specialized review agents** (pr-review-toolkit):
   - silent-failure-hunter on all error paths and calculations.
   - type-design-analyzer on Money, Account, Entry, Ledger types and any new models.
   - pr-test-analyzer for coverage of edge cases, determinism, and invariant tests.
   - code-reviewer / code-simplifier as final polish (only after invariants pass).

4. **Security**:
   - Review any security-guidance findings (precision attacks, input of rates/assumptions, serialization).
   - Flag any risk to monetary integrity.

5. **Summary**:
   - Pass / Fail with ranked issues.
   - Actionable fixes tied back to kernel primitives.
   - "Ledger review passed. All layers clean." only when every step succeeds.

## Triggers
"ledger review", "full ledger review", "bean counter review", "review for shipping", "pre-pr financial review".

Always gate shipping on this when value is involved. "stop ledger-review" to pause.

