# Ledger

<p align="center">
  <img src="assets/bean-counter.jpg" width="260" alt="Ledger ΓÇö The Bean Counter">
</p>

<p align="center">
  <strong>Ledger ΓÇö The Uncompromising Financial Architect</strong><br>
  <strong>The Bean Counter</strong>
</p>

<p align="center">
  <em>He says nothing. He balances the books to the penny. Mistakes do not leave the building.</em>
</p>

<p align="center">
  <img src="assets/bean-counter-logo.jpg" width="120" alt="Bean Counter logo icon">
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
- The agent *is* the Bean Counter: exacting, silent until the numbers prove themselves

## How it works

Before any financial modeling, recognition, or code, the agent runs the **Zero-Skip Execution Protocol**:

1. Does this touch value, accounts, recognition, measurement, or risk pricing?
2. Can it be expressed with the immutable kernel? (`Money.from`, `JournalEntry`, `Ledger.apply`)
3. Is there a canon fact or graph-retrieved knowledge that governs it? Cite the source.
4. Is the result deterministic and reproducible?
5. Do `validateEntry` and the ledger prove the invariants (balance, accounting equation)?

## Install

Not yet published to npm. Install from source:

```bash
git clone https://github.com/eternal-roman/ledger.git
cd ledger && npm install && npm run build
```

Ships persona files (AGENTS.md, skills/, commands/, assets/) for agents.

For AI hosts:
- Copy `AGENTS.md` (and/or `skills/ledger/SKILL.md`) or use adapters (`.cursor/rules/ledger.mdc`, etc.).
- Claude Code: add via .claude-plugin/.
- `pi` config for skill loading.

**Shell note**: Bash-first hooks (see `hooks/README.md`, `docs/claude-plugins.md`). Git Bash recommended on Windows.

For developing this package: recommended plugins (see CLAUDE.md, .claude/settings.json):
- superpowers, pr-review-toolkit, skill-creator, plugin-dev, security-guidance, etc.

See `.claude/`, `CLAUDE.md`, `AGENTS.md`, `skills/ledger/references/`.

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

## AI Agent Integration

Load `AGENTS.md` (or `skills/ledger/SKILL.md`). Many hosts discover adapters (`.cursor/rules/ledger.mdc`, `.clinerules/ledger.md`, etc.).

The agent becomes **The Bean Counter**:
- Executes Zero-Skip Protocol every task (Plan & Unpack → Gap Analysis → complete Artifact)
- Uses `Money`/`JournalEntry` only (never floats)
- Grounds in accounting canon (IFRS/GAAP); surfaces citations
- Proves invariants via `validateEntry` + `Ledger.apply` before output
- Uses graph knowledge (levers) only when required

Commands are **agent-guidance prompts** (skills the host loads), not built CLI engines —
each instructs the agent to apply the kernel and citation graph for that task:

| Command            | What it guides the agent to do |
|--------------------|--------------|
| `/ledger-verify`   | Check a diff/snippet for invariants, Money usage, balanced entries, citations |
| `/ledger-audit`    | Whole-project financial hygiene and structural integrity review |
| `/ledger-cite`     | Retrieve matching facts from the IFRS/GAAP citation graph |
| `/ledger-reconcile`| Turn assumptions and rates into validated double-entry with citations |
| `/ledger-sim`      | Walk a seeded scenario, tracing assumptions and proving invariants |

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

Graphic (assets/bean-counter.jpg) exemplifies the persona. Preserve exacting style on updates.

Keep distribution (skills, commands, adapters) consistent.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
