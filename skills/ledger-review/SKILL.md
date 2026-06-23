---
name: ledger-review
description: >
  Full financial review combining ledger invariants (verify/audit) + host verification agents when present (e.g. superpowers TDD/verification or pr-review-toolkit) + security. Performs ledger layer always. Notes when optional layers are unavailable. Use for "ledger-review this", "full review before PR", "run the complete Ledger Chad review", or before shipping changes that touch money.
license: MIT
---

# ledger-review

Perform a complete, multi-layered review of financial code or changes.

## Steps
1. **Ledger invariants**: `/ledger-verify` or `/ledger-audit`. Enforce Money.from, JournalEntry, validateEntry, Ledger.apply, balance/equation, citations. Emit Artifact if missing.
2. **Host verification (when available)**: If superpowers-style TDD + verification-before-completion or equivalent skills/agents exist in the workspace, confirm they were followed.
3. **Host review agents (when available)**:
   - pr-review-toolkit equivalents (silent-failure-hunter, type-design-analyzer, pr-test-analyzer, code-reviewer/simplifier) when present.
4. **Security**: Apply guidance findings; flag monetary risks.
5. **Summary**: Pass/Fail + ranked issues + kernel-tied fixes. Always include ledger layer result. If optional layers were not available, note "Ledger layer only (no superpowers/pr-review equivalents detected)". "Passed" requires clean ledger invariants + any available host layers.

## Triggers
"ledger review", "full ledger review", "Ledger Chad review", "alpha review", "review for shipping", "pre-pr financial review".

Always gate shipping on this when value is involved. "stop ledger-review" to pause.

