# Scope and Layers (What the Kernel + Skills Actually Deliver Today)

## What the Kernel Enforces (src/core + src/verify)
- `Money.from` (exact Decimal, rejects non-int JS numbers, see money.ts:86-93).
- `JournalEntry` + `validateEntry` (balance per currency, >=2 lines, positive amounts, scale, ISO date, no currency mix in one entry).
- Immutable `Ledger.apply` (re-validates on every apply).
- `auditHash()` (SHA-256 length-prefixed chain, `ledger-audit-v1`).
- `verifyFundamentalEquation`, `trialBalance`, `incomeStatement`, `balanceSheet`.
- `runTrace` (per-step checkpoints with balances + equation + hash prefix).
- `verifyDeterminism`, `makeCanonicalArtifact` + validator, `checkConformance`.

## Layers Built on the Kernel (current shipping)
- Trading: `fillToEntries`, custody, fees (taker/maker), deposits/withdrawals (src/trading).
- Portfolio: lot relief (FIFO etc via tags), realized/unrealized PnL (src/portfolio).
- Investing: time/money weighted returns, allocation drift, planRebalance (src/investing).
- Crypto: transfers (one-shot + two-phase), network fees (src/crypto).
- Instruments + FX: asset scales, createFxConversion.

## Skills / Commands Layer
Agent guidance (skills/*.SKILL.md + commands/*.toml) that instructs the model to use the above primitives + `CanonicalFinancialArtifact`.
The mechanical enforcement is now also available via `scripts/ledger-verify.ts` / `npm run verify:ledger`.

## Limitations (see also docs/roadmap.md)
- No complete schedule engines for IFRS 15/16 (deferred; roadmap Option A).
- Citation graph seeds are a small, high-quality starter set (see docs/CITATION-COVERAGE.md). Not a full canon replacement.
- Skills are instructions + the CLI/script layer. LLM fidelity still matters for complex modeling; use the kernel functions directly in code for determinism.

Graceful degradation: ledger layer always runs; when host equivalents absent note "Ledger layer only (no superpowers/pr-review equivalents detected)".

Use `docs/CORE-PROTOCOL.md` + the checklist for every value-touching change.
