---
name: ledger-reconcile
description: >
  Turn assumptions, rates, or a prose transaction into balanced, validated JournalEntry
  objects with citations. Use for reconcile, "book this", "turn this into entries",
  or /ledger-reconcile.
license: MIT
---

# ledger-reconcile

Assumptions → `Money.from` → balanced `JournalEntry` → `validateEntry` → `Ledger.apply`. Cite every rate. Output entries + proof + sources.
