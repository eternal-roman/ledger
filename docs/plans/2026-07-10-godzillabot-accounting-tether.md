# Tether: GodzillaBot Accounting Remediation

| Field | Value |
|---|---|
| **Document ID** | `GB-ACCT-TETHER-2026-07-10` |
| **Full plan (canonical)** | `C:\Users\elamj\Dev\GodzillaBot\docs\plans\2026-07-10-accounting-ledger-remediation-plan.md` (`GB-ACCT-PLAN-2026-07-10` rev **1.1**) |
| **Venue authority** | `C:\Users\elamj\Dev\kraken-cli` **v0.3.2** — fees, orders, ledgers, recon feeds (plan **§14**) |
| **Status** | Reference pointer only — do not implement from this file |
| **Commit policy** | Uncommitted reference unless owner requests |

## Why this exists

GodzillaBot’s long-standing ledger/count discrepancies were evaluated against this repo’s kernel **and** the latest kraken-cli surface. The **full** defect inventory, architecture, phase WBS, multi-agent DAG, kraken-cli integration, and test evidence protocol live in the GodzillaBot plan above.

## One-paragraph diagnosis

GodzillaBot is not double-entry: float FIFO in `PortfolioTracker`, WAC on `Position`, UUID vs `kraken_*` trade ids (double lots), monitor **save-then-FIFO** (phantom realized), recon log-only, grid on a parallel profit stream, **stale static fee tiers (0.40% taker vs kraken-cli starter 0.26%)**, no live TradeVolume, no Kraken ledgers stream. Ledger **can** close money math, lots, and replay/`audit_hash`; **kraken-cli** is the authority for venue fees/methods/history; neither alone fixes identity + recon policy + grid wiring.

## Kernel surfaces to use

| Need | Location |
|---|---|
| Fill → balanced entries | `src/trading/postings.ts` · Python `reference-implementations/python/ledger/trading.py` |
| FIFO lot relief / realized | `src/portfolio/lots.ts`, `pnl.ts` · Python `lots.py` |
| CEX walkthrough | `examples/crypto-cex.ts` |
| Protocol | `docs/CORE-PROTOCOL.md`, `AGENTS.md` |

## Venue surfaces (kraken-cli)

| Need | Location |
|---|---|
| Fee tiers / maker-taker | `skills/kraken-fee-optimization/SKILL.md`, `kraken volume` |
| History + ledgers | `skills/kraken-portfolio-intel/SKILL.md`, `kraken-tax-export` |
| Orders / oflags / cl_ord_id | `src/commands/trade.rs`, `skills/kraken-order-types` |
| Funding deposits/withdrawals | `skills/kraken-funding-ops` |
| Grid patterns | `skills/kraken-grid-trading` |

## Agent reconnect

> Load `GB-ACCT-PLAN-2026-07-10` §0 + **§14**. Phase 0 ADR before code. Phase 1 = A-01 identity + A-02 monitor FIFO + **A-25/A-26 fee authority** (TradeVolume). Phase 2 = Python ledger shadow. Venue: kraken-cli ≥0.3.2. Evidence = pytest + audit_hash + fee fixture; no prose-only “fixed”.

## Related in this repo

- Recovery Claim Engine (separate product): `docs/plans/2026-07-10-recovery-claim-engine-reference-plan.md`
