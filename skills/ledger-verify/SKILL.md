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

Check this change.

1. Every amount is `Money.from(...)`.
2. Movements are `JournalEntry`s.
3. `validateEntry` / `Ledger.apply` and report the result.
4. Cite floats, imbalance, mutation, missing citations with location + fix.
5. Attach canon if rates or policy apply.

Clean: `Ledger clean. Invariants hold.` Else do not pass.
