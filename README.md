# Ledger

<p align="center">
  <img src="assets/bean-counter.jpg" width="260" alt="Ledger — The Bean Counter">
</p>

<p align="center">
  <strong>Ledger — The Uncompromising Financial Architect</strong><br>
  <strong>The Bean Counter</strong>
</p>

<p align="center">
  <em>He says nothing. He balances the books to the penny. Mistakes do not leave the building.</em>
</p>

<p align="center">
  <img src="assets/bean-counter-logo.jpg" width="120" alt="Bean Counter logo icon">
</p>

Ledger is the canonical library + AI guardrails package for architecting, evaluating, and building financial, accounting, investing, and tax software components with flawless precision.

You know him. Green eyeshade low, red pencil ready, oversized ledger open. Show him a journal entry or a valuation model and he will find the imbalance, the float, the unstated assumption — or he will say nothing and let it pass only when debits equal credits and every rate has a source.

Where other systems cut corners, Ledger builds vaults. It guarantees every component is structurally sound, mathematically deterministic, and anchored in institutional-grade best practices.

It makes structural and functional integrity **impossible to violate** by accident:

- Exact decimal arithmetic (never floats)
- Enforced double-entry + accounting equation (GAAP/IFRS)
- Immutable append-only ledgers with full audit
- Deterministic, reproducible by default
- Zero-Skip Execution: Plan & Unpack, Gap Analysis, complete Artifact (build plan) before any production code
- Grounded in canonical bodies of knowledge: Accounting & Banking, Finance & Capital Management, Economics & Public Policy, Tax & Estate Law
- Graph-theory knowledge retrieval: levers fetch only the required rules and canon on demand
- The agent *is* the Bean Counter: exacting, silent until the numbers prove themselves

## How it works

Before any financial modeling, recognition, or code, the agent runs the **Zero-Skip Execution Protocol**:

1. Does this touch value, accounts, recognition, measurement, or risk pricing?
2. Can it be expressed with the immutable kernel? (`Money.from`, `JournalEntry`, `Ledger.apply`)
3. Is there a canon fact or graph-retrieved knowledge that governs it? Cite the source.
4. Is the result deterministic and reproducible?
5. Do `validateEntry` and the ledger prove the invariants (balance, accounting equation)?

The graphic of the Bean Counter — eyeshade, ledger, red pencil — embodies the presence that refuses to ship anything unproven.

## Install

For the library + reference implementation:

```bash
npm install ledger
```

The package ships the persona files (AGENTS.md, skills/, commands/, assets/ graphic) so agents can load them directly.

For AI hosts:

- Copy `AGENTS.md` (and/or `skills/ledger/SKILL.md`) into your project or global rules.
- Use host adapters in this repo (`.cursor/rules/ledger.mdc`, `.clinerules/ledger.md`, etc.).
- For Claude Code / similar marketplaces: add the repo as plugin source (it provides .claude-plugin/).
- The `pi` config enables skill loading in compatible harnesses.
See the package distribution patterns (skills, commands, adapters) for host integration.

## Core Usage

```ts
import { Money, Account, AccountType, createBalancedEntry, emptyLedger, validateEntry } from 'ledger';

const cash = new Account('1000', 'Cash', AccountType.Asset);
const equity = new Account('3000', 'Owner Equity', AccountType.Equity);

const contribution = createBalancedEntry(
  'cap-001',
  '2026-06-21',
  cash,
  equity,
  Money.from('10000', 'USD'),
  'Initial capital'
);

const result = validateEntry(contribution);
if (!result.ok) throw new Error('Invariant violation');

let ledger = emptyLedger().apply(contribution).ledger;

console.log(ledger.balance(cash).toString()); // "10000.00 USD"
```

All operations are pure and immutable. The kernel will refuse any unbalanced state.

See `examples/personal-ledger.ts` for a complete working example.

## Common Patterns
- `Money.zero(currency)`, `from(value, currency)`, `add`/`sub`/`mul`/`div`/`allocate(ratios)`, `compare`, `convert(FXRate)`
- `makeLine` + `createBalancedEntry` / `createEntry` (compound) / `createFxConversion`
- `validateEntry(entry)` (kernel gate) + `ledger.apply(entry)`
- `ledger.balance(account)`, `verifyFundamentalEquation()`, `snapshot()`, `trialBalance()`
- Knowledge: `loadDefaultKnowledge()` + lever queries for GAAP/IFRS citations
- Always prove with `validateEntry` + accounting equation before use.



## AI Agent Integration

Copy or load `AGENTS.md` into your agent context (or install the plugin/skill package for your host). Many hosts also discover host-specific adapters (`.cursor/rules/`, `.clinerules/`, `.windsurf/rules/`, `.github/copilot-instructions.md`, etc.).

The agent becomes **The Bean Counter** (Ledger — The Uncompromising Financial Architect):
- Executes the Zero-Skip Execution Protocol on every task (Plan & Unpack → Gap Analysis → complete Artifact)
- Uses `Money` and `JournalEntry` exclusively; never floats
- Grounds logic in canonical bodies of knowledge (GAAP/IFRS, tax law, macro policy) and surfaces citations
- Proves invariants with `validateEntry` and `Ledger.apply` before any output
- Uses graph-retrieved knowledge (levers / dimensions) only when required

Ledger stands alone for uncompromising financial structure.

Commands (when supported by host):

| Command            | What it does |
|--------------------|--------------|
| `/ledger-verify`   | Check diff/snippet for invariants, Money usage, balanced entries, citations |
| `/ledger-audit`    | Whole-project financial hygiene and structural integrity audit |
| `/ledger-cite`     | Retrieve canon-backed facts using knowledge levers (GAAP/IFRS, policy, tax) |
| `/ledger-reconcile`| Turn assumptions and rates into validated double-entry with citations |
| `/ledger-sim`      | Run seeded deterministic scenarios with full assumption trace and proof |

## Determinism & Verification

```bash
npm test
npm run verify   # determinism harness
npm run build
```

Property-based tests + explicit reproducibility checks are part of the package.

## Principles

- Zero-Skip Execution Protocol: nothing handwavy or lazy survives review
- Exact value, always (deterministic decimal arithmetic)
- Double-entry enforced at the kernel (GAAP/IFRS aligned)
- Immutability + provenance + full audit trail
- Graph-theory knowledge retrieval for targeted canon
- Fail closed. The Final Verification: "Was this lazy? Is this mathematically and structurally undeniable?"
- Minimal surface that still protects integrity

## Development

When updating persona text (AGENTS.md, skills/*/SKILL.md, commands/*.toml, adapters), keep them consistent with the Zero-Skip rules and each other.

Run the verification harness:

```bash
npm run verify:full
```

The graphic (assets/bean-counter.jpg) exemplifies the Bean Counter; updates to it should preserve the high-contrast, exacting presence without adding explanatory prose about its style.

Keep distribution components (skills layout, toml commands, adapters) consistent for host use.

## License

MIT

Built so that financial mistakes simply do not happen. Balance the books.
