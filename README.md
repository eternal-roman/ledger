# Ledger

<p align="center">
  <img src="assets/ledger-chad.jpg" width="260" alt="Ledger Chad — Alpha of the Ledger">
</p>

<p align="center">
  <strong>Ledger Chad — Alpha of the Ledger.</strong><br>
  <strong>Float-Phobic, GAAP-Pilled, Double-Entry Maxxing.</strong>
</p>

<p align="center">
  <em>Cool. Calm. Collected. Alpha Maxxing. Mistakes do not ship, bro.</em>
</p>

<p align="center">
  <img src="assets/ledger-chad-logo.jpg" width="120" alt="Ledger Chad logo icon">
</p>

<p align="center">
  <img src="assets/ledger-chad-banner.jpg" width="600" alt="Ledger Chad Banner">
</p>

Ledger is the canonical library + AI guardrails for building exact financial, accounting, investing, and tax components.

It enforces integrity that cannot be violated by accident:

- Exact decimal arithmetic (never floats)
- Enforced double-entry + accounting equation (GAAP/IFRS)
- Immutable append-only ledgers with full audit
- Deterministic, reproducible by default
- Zero-Skip Execution: Plan & Unpack, Gap Analysis, complete Artifact before any production code
- Grounded in accounting canon: IFRS conceptual framework + IAS/IFRS recognition, US-GAAP (ASC 606)
- A small citation graph: levers fetch the IFRS/GAAP facts that match a query
- The agent *is* Ledger Chad: the alpha bookkeeper — cool, calm, collected, dominant on the invariants.

## How it works

Before any financial modeling, recognition, or code, the agent runs the **Zero-Skip Execution Protocol**:

1. Does this touch value, accounts, recognition, measurement, or risk pricing?
2. Can it be expressed with the immutable kernel? (`Money.from`, `JournalEntry`, `Ledger.apply`)
3. Is there a canon fact or graph-retrieved knowledge that governs it? Cite the source.
4. Is the result deterministic and reproducible?
5. Do `validateEntry` and the ledger prove the invariants (balance, accounting equation)?

## Install

Not yet published to npm. Install from source (for library + persona files):

```bash
git clone https://github.com/eternal-roman/ledger.git
cd ledger && npm install && npm run build
```

To consume the library (Money, Ledger kernel) in another repo:

```bash
# From another project (example)
npm install file:/absolute/path/to/ledger
# or a packed tarball, git dep, or symlink during dev
```

Then: `import { Money, ... } from 'ledger'` (or 'ledger/core').

The plugin install (Grok/Claude) also includes `dist/` so the runtime is available to the host if needed.

Ships persona files (AGENTS.md, skills/, commands/, assets/) for agents.

For AI hosts (plugin install recommended):
- **Grok**: `grok plugin install /absolute/path/to/ledger --trust` (or from a marketplace). Provides all `/ledger-*` slash commands + skills globally (user scope) or per project. Reload via `r` in `/plugins` modal or restart. Use qualified names (e.g. `plugin:ledger:ledger-verify`) on collisions.
- Claude Code: add via `.claude-plugin/`.
- Copy `AGENTS.md` (and/or `skills/ledger/SKILL.md`) for hosts without plugin support. Adapters (`.cursor/rules/ledger.mdc`, etc.) also work.
- `pi` section and root `plugin.json` / `hooks/hooks.json` for first-class discovery.

**Shell / hooks note**: Node hook (used by Grok) + bash-first (Claude). Git Bash recommended on Windows for full bash hooks; node path works in pure pwsh. See `hooks/README.md`.

For developing this package (host plugins or equivalents):
- planning/TDD/verification flows (host equivalents when present — e.g. superpowers-style or pr-review-toolkit-style)
- review agents (host equivalents)
- skill/plugin helpers, security guidance, commit tools

See `AGENTS.md`, `skills/ledger/references/`, and host-specific docs.

## Core Usage

```ts
import { Money, Account, AccountType, createBalancedEntry, emptyLedger, validateEntry } from 'ledger';

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
- `ledger.auditHash()` — SHA-256 chain (tamper-detect); `verifyDeterminism` rebuilds + compares.
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
} from 'ledger';

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
- **`crypto/`** — per-venue exchange charts and inter-exchange transfers (one-shot or two-phase
  in-transit), network fees burned.

Cost basis rides in the kernel's audit-hashed line `tags`, so lots and P&L are reproducible from the
ledger alone. See `examples/crypto-cex.ts`, `examples/portfolio-rebalance.ts`, `examples/returns.ts`.

## AI Agent Integration

Load `AGENTS.md` (or `skills/ledger/SKILL.md`). Hosts with plugin support (Grok, Claude Code, etc.) discover the full package including slash commands.

**Grok**: after `grok plugin install ... --trust`, the commands appear in `/` autocomplete and skills are active everywhere. Run `/ledger-verify`, `/ledger-audit`, `/ledger-cite`, `/ledger-reconcile`, `/ledger-sim`, `/ledger-review`, `/ledger`.

The agent becomes **Ledger Chad**, the Alpha Bookkeeper:
- Executes Zero-Skip Protocol every task (Plan & Unpack → Gap Analysis → complete Artifact)
- Uses `Money`/`JournalEntry` only (never floats)
- Grounds in accounting canon (IFRS/GAAP); surfaces citations
- Proves invariants via `validateEntry` + `Ledger.apply` before output
- Uses graph knowledge (levers) only when required
- Leads with alpha confidence: "Double-Entry or Get Beta." "Mistakes do not ship, bro."

Commands are **agent-guidance prompts** (skills the host loads), not built-in engines.
They instruct the agent to use the real exported functions (see src/verify, src/core/journal, src/core/ledger). For direct/script use call the functions or the `ledger-verify` script / `npm run verify:ledger`.

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

- Zero-Skip Execution Protocol: nothing handwavy or lazy survives review
- Exact value, always (deterministic decimal arithmetic)
- Double-entry enforced at the kernel (GAAP/IFRS aligned)
- Immutability + provenance + full audit trail
- Graph-theory knowledge retrieval for targeted canon
- Fail closed. The Final Verification: "Was this lazy? Is this mathematically and structurally undeniable?"
- Minimal surface that still protects integrity

## Development

Keep persona text (AGENTS.md, skills/*/SKILL.md, commands/*.toml, adapters) consistent with Zero-Skip.

Run:
```bash
npm run verify:full
```

Graphic (assets/ledger-chad.jpg) exemplifies Ledger Chad — the alpha bookkeeper in green ALPHA visor and Patagonia vest, cool calm collected dominance over the ledger. Preserve the consistent meme style on updates.

Keep distribution (skills, commands, adapters) consistent.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
