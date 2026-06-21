---
name: ledger-reconcile
description: >
  Convert assumptions, rates, policy impacts, or informal descriptions into fully balanced, validated double-entry JournalEntry objects with attached citations. Use for "reconcile this", "turn these assumptions into entries", "ledger-reconcile", or /ledger-reconcile.
license: MIT
---

# ledger-reconcile

Given assumptions or a scenario description:
- Identify all value movements.
- Construct balanced JournalEntry(s) using only core primitives: Money.from, makeLine or equivalent, createBalancedEntry pattern.
- Apply validateEntry / Ledger.apply and prove balance + accounting equation.
- Attach canon citations (from ledger-cite or graph) for every rate, assumption, recognition decision.
- Output the entries + proof + sources.

Never leave implicit values or un-cited rates. Every entry must be reproducible and provable.

Example output structure: the code for the entries, then "Validated. Balance: X. Citations: ... "