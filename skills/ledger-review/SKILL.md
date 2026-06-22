---
name: ledger-review
description: >
  Full financial review combining ledger invariants (verify/audit), superpowers verification, pr-review-toolkit specialized agents (silent failures, types, tests), and security guidance. Use for "ledger-review this", "full review before PR", "run the complete bean counter review", or before shipping changes that touch money.
license: MIT
---

# ledger-review

Perform a complete, multi-layered review of financial code or changes.

## Steps
1. **Ledger invariants**: `/ledger-verify` or `/ledger-audit`. Enforce Money.from, JournalEntry, validateEntry, Ledger.apply, balance/equation, citations. Emit Artifact if missing.
2. **Superpowers**: Confirm TDD + verification-before-completion.
3. **pr-review-toolkit agents**:
   - silent-failure-hunter (errors, calcs)
   - type-design-analyzer (core types)
   - pr-test-analyzer (edge cases, determinism)
   - code-reviewer/simplifier (post-invariants)
4. **Security**: Apply guidance findings; flag monetary risks.
5. **Summary**: Pass/Fail + ranked issues + kernel-tied fixes. "Passed" only if all layers clean.

## Triggers
"ledger review", "full ledger review", "bean counter review", "review for shipping", "pre-pr financial review".

Always gate shipping on this when value is involved. "stop ledger-review" to pause.

