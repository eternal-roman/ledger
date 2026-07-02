# Ledger Success Checklist (before shipping value code)

- Every monetary literal uses `Money.from("..", "CUR")` (string preferred for non-integers; see src/core/money.ts:86 error).
- All value movement expressed as `JournalEntry` (or via `createBalancedEntry`/`createEntry`/`fillToEntries` etc.).
- `validateEntry(entry).ok === true` (or the create* helpers which throw on failure).
- Use `Ledger.apply` (immutable result); never mutate `.entries`, balances, or ledgers.
- For non-trivial logic emit `CanonicalFinancialArtifact` (scope, assumptions, citations, kernelPlan referencing the primitives, proof, reproducibility, auditHash — the real digest a kernel call returned, e.g. `runTrace().finalHash` or `Ledger.auditHash()`). Use `makeCanonicalArtifact`; every field is required, nothing is defaulted.
- Prove with `runTrace` or `verifyDeterminism` + `auditHash` + `verifyFundamentalEquation`.
- Run mechanical check: `npm run verify:ledger -- --scan .` (or `/ledger-verify`) before commit/PR.
- Assumptions, rates, jurisdiction, policy, and citations are explicit and attached.

If any item fails, do not ship. All monetary logic must be kernel-enforced, balanced, and exact.
