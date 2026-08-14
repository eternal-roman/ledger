# Roadmap

Kernel + thin layers. No stubs.

- `src/core` — Money, JournalEntry, validateEntry, Ledger, auditHash, equation
- `src/rules` / `src/knowledge` / `src/verify` — recognition, citation seeds, artifacts
- Shipping layers: IFRS 16 lessee, period locks, closing, FX+CTA, depreciation, trading, lots, cash flow, reconcile

Next standard (e.g. IFRS 15) only if it is as tight as IFRS 16. If a job needs different primitives (bank engine, tax engine), that is a different kernel — do not stretch this one.

Always: exact decimal, real citations, `validateEntry` on every generated entry, tests (golden-master when a published number exists).
