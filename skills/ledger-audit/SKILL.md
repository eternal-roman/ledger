---
name: ledger-audit
description: >
  Whole-repo financial audit. Use for ledger-audit, financial audit, or /ledger-audit.
  Scan for non-kernel money math, reconstruct flows as JournalEntry sequences, prove
  with validateEntry + Ledger.apply + runTrace + auditHash.
license: MIT
---

# ledger-audit

1. Bootstrap the kernel (TS package, or `reference-implementations/python/`).
2. Find money math (floats, accumulators, casts).
3. Rebuild critical flows as `JournalEntry` sequences. Replay with `Ledger.apply` / `runTrace`.
4. Prove equation + `auditHash` at each step. Side-by-side vs original numbers.
5. Artifact for significant constructs.

Pass only when critical paths use the kernel or are proven against it. Then `/ledger-verify` on the change. Host TDD/review after, or say "Ledger layer only".
