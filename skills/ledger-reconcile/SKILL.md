---
name: ledger-reconcile
description: >
  Convert assumptions, rates, policy impacts, or informal descriptions into fully balanced, validated double-entry JournalEntry objects with attached citations. Use for "reconcile this", "turn these assumptions into entries", "ledger-reconcile", or /ledger-reconcile.
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