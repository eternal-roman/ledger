---
name: ledger-reconcile
description: >
  Turn assumptions, rates, or a prose transaction into balanced, validated JournalEntry
  objects with citations. Use for reconcile, "book this", "turn this into entries",
  or /ledger-reconcile.
license: MIT
---

# ledger-reconcile

Given assumptions/scenario:
- Identify value movements.
- Build balanced JournalEntry(s) with core: Money.from + createBalancedEntry.
- validateEntry + Ledger.apply + prove equation.
- Attach citations (via ledger-cite/graph) for rates/assumptions.
- Output entries + proof + sources.

No implicit values or uncited rates. Must be reproducible/provable.