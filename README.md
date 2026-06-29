# Ledger

<p align="center">
  <strong>Exact decimal, double-entry kernel for TypeScript.</strong><br>
  Enforces balanced entries with no floats. Includes MCP server and verification tools.
</p>

<p align="center">
  <a href="https://github.com/eternal-roman/ledger/actions/workflows/ci.yml"><img src="https://github.com/eternal-roman/ledger/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/@eternal-roman/ledger"><img src="https://img.shields.io/npm/v/@eternal-roman/ledger.svg" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT"></a>
</p>

Ledger is an exact-decimal, double-entry kernel for TypeScript with an MCP server for AI agents. It supplies the primitives for financial, accounting, and investing components. The kernel enforces the invariants at the API boundary: unbalanced or float-based entries are rejected and never posted. The kernel fails closed: an invalid entry is rejected, not posted.

LLMs do pattern-matching, not arithmetic — they hallucinate numbers, miscategorize,
and are confidently wrong. One approach is to offload arithmetic and invariants
to a deterministic library so that errors are caught before they are persisted.

## Enforced behaviors (and the failures they address)

| Token-level LLM / float failure | Kernel enforcement |
|---|---|
| `0.1 + 0.2 = 0.30000000000000004`, sub-cent drift | Exact decimal `Money` — no floats, ever; sub-scale amounts rejected |
| Debits ≠ credits, "confidently wrong" entries | Double-entry enforced at the kernel; unbalanced state cannot be applied |
| Silent currency mixing | Per-currency balancing; fails closed without explicit FX legs |
| Tampered or non-reproducible books | SHA-256 audit-hash chain + determinism harness (rebuild = identical hash) |
| Ungrounded claims | Small IFRS/GAAP citation graph |

See [`docs/BENCHMARK.md`](docs/BENCHMARK.md). With the recorded fixture, an unguarded
agent commits **4/8 corrupt entries** and leaves the books unbalanced; the guarded
path lets **0** reach the books and the surviving ledger is balanced, audit-hashed,
and deterministic. Reproduce with `npm run eval`.

## For AI agents — the MCP server

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

The MCP server gives agents tools (`money_compute`, `entry_validate`, `ledger_post`,
`ledger_balance`, `ledger_verify_equation`, `ledger_audit_hash`, `trace_run`,
`cite_lookup`, and more) so they prove rather than guess. See [`mcp/`](mcp/).

## Comparison with related libraries

| | Exact money | Double-entry enforced | Immutable + audit hash | Deterministic harness | DB-agnostic | AI / MCP guardrail |
|---|---|---|---|---|---|---|
| **Ledger** | ✅ | ✅ (kernel) | ✅ | ✅ | ✅ (pure TS) | ✅ |
| dinero.js | ✅ | — | — | — | ✅ | — |
| medici | partial | ✅ | — | — | ❌ (MongoDB) | — |
| Formance / TigerBeetle | ✅ | ✅ | ✅ | partial | ❌ (service / DB) | — |

No library compared above has all of the following at once: exact decimal **+** kernel-enforced double-entry **+**
immutability **+** tamper-evident audit hash **+** a determinism harness **+** zero
database dependency **+** an MCP server.

## Install

```bash
npm install @eternal-roman/ledger
```

Then:
```ts
import { Money, Account, AccountType, createBalancedEntry, emptyLedger, validateEntry, runTrace, makeCanonicalArtifact } from '@eternal-roman/ledger';
// or kernel only: import { ... } from '@eternal-roman/ledger/core';
```

**ESM and CommonJS both work.** The package ships a dual build (`import` and
`require` both resolve, with matching type declarations), so:
```js
const { Money, validateEntry } = require('@eternal-roman/ledger'); // CJS
```
works identically to the ESM `import` above.

Standalone CLI (mechanical verification, no LLM required):
```bash
# after install (bin + scripts are packaged)
npx ledger-verify --help
npx ledger-verify --scan .
npx ledger-verify --prove entries.json

# or directly during dev (from repo)
npx tsx scripts/ledger-verify.ts --scan src
```
The CLI uses the real package kernel (Money.from + JournalEntry factories + runTrace + artifacts).

Examples are included and runnable after install too:
```bash
npx tsx node_modules/@eternal-roman/ledger/examples/personal-ledger.ts
npx tsx node_modules/@eternal-roman/ledger/examples/crypto-cex.ts
# etc.
```
All examples use the public '@eternal-roman/ledger' entry point (or fallback in source tree).

The plugin install (Grok/Claude) also includes `dist/` so the runtime is available to the host if needed.

Ships persona files (AGENTS.md, skills/, commands/) for agents. For pure library use without AI persona, the core + layers + CLI are self-contained. (Images served from GitHub raw URLs in README.)

For AI hosts (plugin install recommended):
- **Grok**: `grok plugin install /absolute/path/to/ledger --trust` (or from a marketplace). Provides all `/ledger-*` slash commands + skills globally (user scope) or per project. Reload via `r` in `/plugins` modal or restart. Use qualified names (e.g. `plugin:ledger:ledger-verify`) on collisions.
- Claude Code: add via `.claude-plugin/`.
- Copy `AGENTS.md` (and/or `skills/ledger/SKILL.md`) for hosts without plugin support. Adapters (`.cursor/rules/ledger.mdc`, etc.) also work.
- Plugin metadata in `plugin.json` and `hooks/hooks.json` for first-class discovery.

**Shell / hooks note**: Node hook (used by Grok) + bash-first (Claude). Git Bash recommended on Windows for full bash hooks; node path works in pure pwsh. See `hooks/README.md`.

For developing this package (host plugins or equivalents):
- planning/TDD/verification flows (host equivalents when present — e.g. superpowers-style or pr-review-toolkit-style)
- review agents (host equivalents)
- skill/plugin helpers, security guidance, commit tools

See `AGENTS.md`, `skills/ledger/references/`, and host-specific docs.

## Core Usage

```ts
import { Money, Account, AccountType, createBalancedEntry, emptyLedger, validateEntry } from '@eternal-roman/ledger';

const cash = new Account('1000', 'Cash', AccountType.Asset);
const equity = new Account('3000', 'Owner Equity', AccountType.Equity);

const contribution = createBalancedEntry(
  'cap-001', '2026-06-21', cash, equity,
  Money.from('10000', 'USD'), 'Initial capital'
);

const result = validateEntry(contribution);
if (!result.ok) throw new Error('Invariant violation');

let ledger = emptyLedger().apply(contribution).ledger;
console.log(ledger.balance(cash).toString()); // "10000.00 USD"
```

Pure and immutable. Kernel refuses unbalanced state.

See `examples/personal-ledger.ts`.

## Common Patterns
- `Money.zero(currency)`, `from(value, currency)`, `add`/`sub`/`mul`/`div`/`allocate(ratios)`, `compare`, `convert(FXRate)` — `Money.from` rejects non-int JS nums (use strings); FX exact, converts round to scale.
- `makeLine` + `createBalancedEntry`/`createEntry` (compound)/`createFxConversion(..., rate?)`.
- `validateEntry(entry)` (balance, scale, ISO date, currency) + `ledger.apply(entry)`.
- `ledger.balance(account[, asOf, currency])`, `balancesByCurrency`, `verifyFundamentalEquation()`, `snapshot()`, `trialBalance()`. Fails closed on multi-currency unless currency given.
- `ledger.auditHash()` — SHA-256 chain (tamper-evident); `verifyDeterminism` rebuilds + compares.
- Knowledge: `loadDefaultKnowledge()` + levers for GAAP/IFRS.
- Prove with `validateEntry` + equation before use.

## Investing & Financial Services

A trading, portfolio, and crypto-exchange layer built entirely on the kernel — a coin
or share is just a non-fiat "currency" (`BTC`@8, `ETH`@18, `AAPL`@4), a trade is a
two-legged FX-style conversion, and the fundamental equation already holds per asset.
Everything stays exact, immutable, double-entry, and deterministic.

```ts
import {
  Money, emptyLedger, defaultAssetRegistry, installAssetScales,
  depositToEntry, fillToEntries, realizedPnL, PriceBook, valuePortfolio,
  planRebalance, timeWeightedReturn, moneyWeightedReturn,
} from '@eternal-roman/ledger';

installAssetScales(defaultAssetRegistry()); // teach Money the asset scales (fiat unchanged)

let l = emptyLedger();
l = l.apply(depositToEntry('d1', '2026-06-22', 'KRAKEN', Money.from('100000', 'USD'))).ledger;
for (const e of fillToEntries({
  id: 'b1', effectiveDate: '2026-06-22', venue: 'KRAKEN', base: 'BTC', quote: 'USD',
  side: 'buy', quantity: Money.from('1', 'BTC'), price: Money.from('60000', 'USD'),
  fee: Money.from('30', 'USD'), liquidity: 'taker',
})) l = l.apply(e).ledger;

realizedPnL(l, 'BTC', 'FIFO');                       // cost-basis lots → realized gains
valuePortfolio(l, priceBook, 'USD');                 // mark-to-market into a reporting currency (cited)
```

- **`instruments/`** — `AssetRegistry` / `AssetSpec` feeding per-asset decimal scales;
  `installAssetScales` is the single additive hook into `Money` (fiat behavior is unchanged).
- **`trading/`** — `Fill` → balanced kernel entries (`fillToEntries`), with custody/cash/clearing
  account conventions, taker fees (expensed) and maker rebates (income); `depositToEntry`/`withdrawalToEntry`.
- **`portfolio/`** — cost-basis lot relief (FIFO/LIFO/HIFO), `realizedPnL`/`unrealizedPnL`, and
  `PriceBook`/`valuePortfolio` consolidation — fail-closed on any unmarked asset.
- **`investing/`** — `timeWeightedReturn`, `moneyWeightedReturn` (IRR, deterministic with an explicit
  `converged` flag), allocation drift, and `planRebalance` (plan only; execute via `fillToEntries`).
- **`crypto/`** — inter-exchange transfers (one-shot or two-phase in-transit) and network fees (via transfers layer on the kernel). See `examples/crypto-cex.ts` for CEX-style custody/fills/PnL.

Cost basis rides in the kernel's audit-hashed line `tags`, so lots and P&L are reproducible from the
ledger alone. See `examples/crypto-cex.ts`, `examples/portfolio-rebalance.ts`, `examples/returns.ts`.

## Accounting standards — IFRS 16 (Leases, lessee)

A concrete implementation for IFRS 16 (lessee) that emits balanced kernel journal entries.
It computes the initial lease liability (present value of payments), the ROU
asset, and the full schedule of interest accretion, principal reduction, and
straight-line depreciation, with paragraph-level citations.

```ts
import { Money, buildSchedule, leaseToEntries } from '@eternal-roman/ledger';

const lease = {
  id: 'L1', commencementDate: '2026-01-01', currency: 'USD', annualDiscountRate: '0.05',
  payments: [
    { date: '2026-12-31', amount: Money.from('10000.00', 'USD') },
    { date: '2027-12-31', amount: Money.from('10000.00', 'USD') },
    { date: '2028-12-31', amount: Money.from('10000.00', 'USD') },
  ],
};
buildSchedule(lease).initialLiability.toString(); // "27232.48 USD"
leaseToEntries(lease);                             // 10 balanced, validated entries
```

The schedule is verified **to the cent** by a golden-master test
(`tests/standards/ifrs16.test.ts`): the liability closes to exactly `0.00`, total
interest reconciles to payments minus initial liability, depreciation sums exactly
to ROU cost, every entry passes `validateEntry`, the fundamental equation holds, and
the audit hash is reproducible.

## AI Agent Integration

Load `AGENTS.md` (or `skills/ledger/SKILL.md`). Hosts with plugin support (Grok, Claude Code, etc.) discover the full package including slash commands.

**Grok**: after `grok plugin install ... --trust`, the commands appear in `/` autocomplete and skills are active everywhere. Run `/ledger-verify`, `/ledger-audit`, `/ledger-cite`, `/ledger-reconcile`, `/ledger-sim`, `/ledger-review`, `/ledger`.

The agent operates under the Zero-Skip discipline:
- Runs the protocol every task (Plan & Unpack → Gap Analysis → complete Artifact)
- Uses `Money`/`JournalEntry` only (never floats)
- Grounds in accounting canon (IFRS/GAAP); surfaces citations
- Proves invariants via `validateEntry` + `Ledger.apply` before output
- Uses graph knowledge (levers) only when required

> There is also an optional **"Ledger Chad"** persona (a float-phobic, double-entry-maxxing
> voice) for hosts that want personality on top of the kernel. It is flavor, not
> substance — see [`docs/agent-persona.md`](docs/agent-persona.md). The behaviors
> described above hold with or without it.

Commands are **agent-guidance prompts** (skills the host loads), not built-in engines.
They instruct the agent to use the real exported functions (see src/verify, src/core/journal, src/core/ledger). For direct or script use, call the functions or the `ledger-verify` script / `npm run verify:ledger`.

See docs/CORE-PROTOCOL.md (contains Zero-Skip Execution Protocol).

| Command            | What it guides the agent to do |
|--------------------|--------------|
| `/ledger-verify`   | Check a diff/snippet for invariants, Money usage, balanced entries, citations |
| `/ledger-audit`    | Whole-repo audit that requires (or models) monetary flows using the kernel primitives (`Money.from`, `JournalEntry` + `validateEntry`, `Ledger.apply` / `runTrace`). Produces proofs and artifacts. |
| `/ledger-cite`     | Retrieve matching facts from the IFRS/GAAP citation graph |
| `/ledger-reconcile`| Turn assumptions and rates into validated double-entry with citations |
| `/ledger-sim`      | Walk a seeded scenario, tracing assumptions and proving invariants |

## Cross-Language Canonical Support

The ledger package provides the canonical implementation in TypeScript/JavaScript. It also ships a reference Python implementation under `reference-implementations/python/ledger/` (Money, JournalEntry, validate_entry, Ledger with apply/equation/auditHash, verify_determinism, CanonicalFinancialArtifact + tests and examples).

When a target repository does not yet use the kernel (especially non-TS codebases), the Python reference (or a faithful port) can be used during audit to model flows and prove invariants.

`/ledger-audit` focuses on actually using these primitives to reconstruct and verify monetary logic.

## Determinism & Verification

```bash
npm test
npm run verify   # determinism harness
npm run build
```

Property-based tests and reproducibility checks are included.

## Principles

- Use the Zero-Skip protocol for value-related work
- Exact decimal arithmetic only (no floats)
- Double-entry enforced via the kernel primitives (with optional GAAP/IFRS citations)
- Immutability, provenance, and audit trail
- Citations from the knowledge graph when relevant
- Fail closed: monetary changes must pass `validateEntry` + `Ledger.apply`
- Small, focused surface for invariant enforcement

## Development

Run the full gate:
```bash
npm run verify:full   # build (ESM+CJS) + typecheck + tests + determinism
npm run eval          # regenerate the benchmark report
```

Keep agent-guidance text (AGENTS.md, skills/*/SKILL.md, commands/*.toml, adapters)
consistent with the Zero-Skip discipline. The optional persona lives in
[`docs/agent-persona.md`](docs/agent-persona.md); keep it clearly separable from the
enforced invariants so the library reads as engineering first.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
