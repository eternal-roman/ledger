---
name: ledger
description: >
  Use for ANY monetary, accounting, ledger, journal, balance, P&L, fee, FX, invoice,
  tax, cost-basis, or valuation work. Exact Money.from (never floats or parseFloat),
  double-entry via JournalEntry + validateEntry + Ledger.apply, MCP money_compute /
  ledger_post, canon citations, Zero-Skip + Canonical Financial Artifact. Trigger on
  money, dollars, currency, bookkeeping, unbalanced books, audit hash, or /ledger.
license: MIT
---

# Ledger

Enforce the kernel. Full contract: `AGENTS.md` and `docs/CORE-PROTOCOL.md`.

- Amounts: `Money.from(...)` or MCP `money_compute`. Never floats.
- Movement: `JournalEntry` → `validateEntry` → `Ledger.apply`.
- Debits = credits. Equation holds. Cite rates and policy.
- `auditHash` must be a digest a kernel call returned.

Output: scope, assumptions, citations, kernel plan, proof, reproducibility, auditHash.

Commands: `/ledger-verify`, `/ledger-audit`, `/ledger-cite`, `/ledger-reconcile`, `/ledger-sim`, `/ledger-review`. CLI: `npx ledger-verify --scan .`.

Not advice. MIT LICENSE. Ledger layer always runs; if no host TDD/review skills exist, say "Ledger layer only".
