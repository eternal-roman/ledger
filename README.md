# Ledger

<p align="center">
  <strong>Agents do not do money math in tokens.</strong><br>
  Exact-decimal double-entry kernel + MCP. Fail-closed. Audit-hashed. Deterministic.
</p>

<p align="center">
  <a href="https://github.com/eternal-roman/ledger/actions/workflows/ci.yml"><img src="https://github.com/eternal-roman/ledger/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/@eternal-roman/ledger"><img src="https://img.shields.io/npm/v/@eternal-roman/ledger.svg" alt="npm"></a>
  <a href="https://www.npmjs.com/package/@eternal-roman/ledger-mcp"><img src="https://img.shields.io/npm/v/@eternal-roman/ledger-mcp.svg" alt="mcp"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT"></a>
</p>

`Money.from` · `validateEntry` · `Ledger.apply`. Invalid entries are rejected, never posted.

## For agents

Do not add, split, convert, or balance amounts yourself. Call the kernel.

```bash
npx -y @eternal-roman/ledger-mcp
```

```json
{
  "mcpServers": {
    "ledger": { "command": "npx", "args": ["-y", "@eternal-roman/ledger-mcp"] }
  }
}
```

Then:

1. Read `ledger://canon/rules` and `ledger://canon/workflow`.
2. Compute with `money_compute`. Validate with `entry_validate`. Post with `ledger_post`.
3. Prove with `ledger_verify_equation` + `ledger_audit_hash`. Never invent an audit hash.
4. Ground treatments with `cite_lookup`. Bundle proof with `artifact_make`.

Rules live in [`AGENTS.md`](AGENTS.md). Protocol: [`docs/CORE-PROTOCOL.md`](docs/CORE-PROTOCOL.md). Machine index: [`llms.txt`](llms.txt). Full tool list: [`mcp/`](mcp/).

Host plugins (Grok and compatible) load `/ledger-verify`, `/ledger-audit`, `/ledger-cite`, `/ledger-reconcile`, `/ledger-sim`, `/ledger-review` from this repo. Copy `AGENTS.md` or `skills/ledger/SKILL.md` if the host has no plugin loader.

## Why this exists

Token-level arithmetic is indifferent to scale, balance, and currency. The kernel is not.

| Failure | Kernel |
|---|---|
| Float drift / sub-scale | `Money.from` rejects |
| Unbalanced entry | `validateEntry` + `Ledger.apply` reject |
| Silent currency mix | Per-currency; FX must be explicit |
| Tamper / non-repro | SHA-256 `auditHash` (`ledger-audit-v2`) + determinism harness |
| Ungrounded treatment | Starter IFRS/GAAP graph via `cite_lookup` |

| | Exact money | Double-entry | Immutable + audit hash | Deterministic | No DB | Agent / MCP |
|---|---|---|---|---|---|---|
| **Ledger** | yes | kernel | yes | yes | yes | yes |
| dinero.js | yes | — | — | — | yes | — |
| medici | partial | yes | — | — | MongoDB | — |
| Formance / TigerBeetle | yes | yes | yes | partial | service | — |

## Install (library)

```bash
npm install @eternal-roman/ledger
```

```ts
import { Money, Account, AccountType, createBalancedEntry, emptyLedger, validateEntry } from '@eternal-roman/ledger';

const cash = new Account('1000', 'Cash', AccountType.Asset);
const equity = new Account('3000', 'Owner Equity', AccountType.Equity);

const contribution = createBalancedEntry(
  'cap-001', '2026-06-21', cash, equity,
  Money.from('10000', 'USD'), 'Initial capital'
);

if (!validateEntry(contribution).ok) throw new Error('Invariant violation');

const ledger = emptyLedger().apply(contribution).ledger;
ledger.balance(cash).toString(); // "10000.00 USD"
```

ESM and CommonJS. Kernel-only import: `@eternal-roman/ledger/core`.

Mechanical check (no LLM):

```bash
npx ledger-verify --scan .
npx ledger-verify --prove entries.json
```

## Layers on the kernel

All of these emit validated `JournalEntry`s. None reimplement money.

- **Trading / custody** — `fillToEntries`, deposits, withdrawals, taker/maker fees
- **Portfolio** — FIFO/LIFO/HIFO lots, realized/unrealized P&L, `valuePortfolio`
- **Investing** — time- and money-weighted returns, allocation, `planRebalance`
- **Crypto transfers** — one-shot or two-phase in-transit + network fees
- **IFRS 16 lessee** — PV liability, ROU, full schedule, golden-master to the cent
- **Close / FX / depreciation / cash flow / reconcile** — period locks, CTA, schedules, direct-method cash flow

Asset scales (BTC=8, ETH=18, …) are installed with `installAssetScales(defaultAssetRegistry())`. Fiat is unchanged. See `examples/`.

## Verify

```bash
npm test
npm run verify        # determinism harness
npm run verify:full   # build + typecheck + tests + versions + MCP smoke
npm run eval          # unguarded vs kernel benchmark
```

## Docs

| Doc | For |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Agent contract |
| [`llms.txt`](llms.txt) | Machine-readable map |
| [`docs/CORE-PROTOCOL.md`](docs/CORE-PROTOCOL.md) | Zero-Skip protocol |
| [`docs/SUCCESS-CHECKLIST.md`](docs/SUCCESS-CHECKLIST.md) | Pre-ship checklist |
| [`docs/ANTI-PATTERNS.md`](docs/ANTI-PATTERNS.md) | What the kernel rejects |
| [`docs/SCOPE-AND-LAYERS.md`](docs/SCOPE-AND-LAYERS.md) | What ships today |
| [`mcp/README.md`](mcp/README.md) | MCP tools, resources, prompts |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Developing this repo |

Python kernel port: `reference-implementations/python/` (same invariants; install an asset-scale resolver for non-fiat).

## License

MIT. See [LICENSE](LICENSE).

## Disclaimer

Deterministic primitives and verification tools. **Not financial, tax, legal, or accounting advice.** You are responsible for inputs, assumptions, rates, jurisdiction, and compliance. Tests and benchmarks are due diligence, not a certification. See LICENSE.
