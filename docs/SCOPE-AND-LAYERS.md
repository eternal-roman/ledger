# Scope and layers

What ships. Nothing here is a stub.

## Kernel (`src/core` + `src/verify`)

- `Money.from` — exact decimal; rejects non-integer JS numbers and non-finites
- `JournalEntry` + `validateEntry` — ≥2 lines, per-currency balance, scale, ISO date, no mixed currency
- Immutable `Ledger.apply` — re-validates; rejects duplicate ids and account redefinition
- `auditHash()` — SHA-256 length-prefixed chain, format `ledger-audit-v2` (includes account type and name)
- `verifyFundamentalEquation`, `trialBalance`, `incomeStatement`, `balanceSheet`
- `runTrace`, `verifyDeterminism`, `makeCanonicalArtifact`, `checkConformance`

## Layers (all emit kernel entries)

- Trading, portfolio lots / P&L, investing returns / rebalance, crypto transfers
- Instruments + FX (`installAssetScales`, `createFxConversion`)
- IFRS 16 lessee (golden-master)
- Period locks, closing, FX translation + CTA, depreciation
- Direct-method cash flow, position reconcile

## Agent surface

Skills under `skills/` and commands under `commands/` tell the model to use the primitives. Enforcement is the kernel, the MCP adapter, and `npx ledger-verify`.

## Limits

- Citation graph is a starter set (`docs/CITATION-COVERAGE.md`), not a full canon.
- LLM fidelity still matters for *modeling*. Determinism comes from calling the kernel, not from the prompt.
- Python under `reference-implementations/python/` ports the kernel invariants. Fiat scales match TypeScript. Non-fiat scales need a resolver (or the small built-in BTC/ETH/stable map). Hash format is `ledger-audit-v2`.

See `docs/CORE-PROTOCOL.md` and `docs/SUCCESS-CHECKLIST.md`.
