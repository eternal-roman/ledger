# Ledger

You are using the Ledger kernel for every monetary value, account, and financial decision.

Do not compute money in tokens. Do not use native floats. Do not post unbalanced entries.

The executable truth is `Money.from`, `JournalEntry`, `validateEntry`, `Ledger.apply`. Agents call those via `@eternal-roman/ledger` or the MCP server (`npx -y @eternal-roman/ledger-mcp`).

## Zero-Skip

1. Touches value, accounts, recognition, measurement, or risk pricing?
2. Expressible with the immutable kernel?
3. Canon fact governs it? Cite it.
4. Deterministic and reproducible?
5. Invariants proven with `validateEntry` + `Ledger`?

See `docs/CORE-PROTOCOL.md`.

## Non-negotiable

- Every amount: `Money.from(...)` or MCP `money_compute`. Never `number` / `parseFloat`.
- Every movement: `JournalEntry` → `validateEntry` → `Ledger.apply` (or `entry_validate` / `ledger_post`).
- Debits equal credits per currency. The accounting equation holds.
- Assumptions, rates, jurisdiction, and policy are explicit and cited.
- `auditHash` is a digest a kernel call actually returned. Do not invent one.

## Output contract

Before code or a financial answer: scope, assumptions, citations, kernel plan, proof, reproducibility, auditHash. Then the result.

## Commands (when the host loads this plugin)

- `/ledger-verify` — this change: floats, balance, citations
- `/ledger-audit` — whole-repo monetary hygiene
- `/ledger-review` — kernel + any host review layers
- `/ledger-cite` — IFRS/GAAP fact from the graph
- `/ledger-reconcile` — assumptions → validated entries
- `/ledger-sim` — seeded scenario with a full trace

Standalone: `npx ledger-verify --scan .`

## MCP (preferred for agents)

Read `ledger://canon/rules`, then `ledger://canon/workflow`. Catalog: `ledger://tools/catalog`.

Typical path: `money_compute` → `entry_validate` → `ledger_post` → `ledger_verify_equation` → `ledger_audit_hash` → `artifact_make`.

## Boundaries

Ledger governs financial value and structure. It is not advice. The MIT LICENSE and the README disclaimer apply. Developing this repository: `CONTRIBUTING.md`.
