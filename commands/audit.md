# /ledger-audit

Whole-repo audit that requires monetary logic to be expressed (or explicitly modeled) using the ledger kernel.

Key expectations:
- Use `Money.from`, `JournalEntry` construction + `validateEntry`, and `Ledger.apply` (or `runTrace`).
- When code bypasses the kernel, reconstruct the flows as proper entries and replay + prove them.
- Use scanning to locate expressions that need modeling.
- Provide numeric proofs and side-by-side comparisons.
- Emit `CanonicalFinancialArtifact` for significant financial logic.

Focus on the primitives and proofs, not just naming conventions.

Complements `/ledger-verify` and `/ledger-review`. The ledger kernel layer always runs.
