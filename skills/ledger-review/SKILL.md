---
name: ledger-review
description: >
  Pre-ship financial review. Use for ledger-review, review before PR, or shipping
  money code. Always runs kernel invariants; adds host TDD/review/security layers
  when those skills exist.
license: MIT
---

# ledger-review

1. Kernel: `/ledger-verify` or `/ledger-audit`.
2. Host TDD / review / security if those skills exist.
3. Pass/fail + ranked issues. "Passed" needs a clean ledger layer. If no host layers: "Ledger layer only".
