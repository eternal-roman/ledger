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

Ledger is the canonical library and AI guardrails for building exact financial, accounting, and tax components.

It enforces structural integrity that cannot be violated by accident: exact decimal arithmetic (no floats), double-entry with the accounting equation, immutable ledgers, determinism, and canon grounding. The Zero-Skip protocol and Bean Counter persona make "good enough" impossible.

## How it works

Every financial task follows the **Zero-Skip Execution Protocol** (see AGENTS.md):

1. Touches value, accounts, recognition, measurement, or risk?
2. Expressible with the kernel?
3. Canon fact or citation?
4. Deterministic and reproducible?
5. Invariants proven by `validateEntry` + equation?

The Bean Counter persona refuses to ship unproven work.

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

**Shell note**: Hooks and development are bash-first (see `hooks/README.md` and `docs/claude-plugins.md`). Git Bash recommended on Windows to eliminate pwsh.

When developing *this* package in Claude Code, a curated set of plugins is recommended and pre-installed at project scope (see CLAUDE.md and .claude/settings.json):
- superpowers (structured dev)
- pr-review-toolkit (specialized reviews)
- skill-creator + plugin-dev (for evolving skills/commands)
- security-guidance, hookify, commit-commands, claude-md-management, etc.

See `.claude/`, `CLAUDE.md`, `AGENTS.md` ("When Developing This Library"), and `skills/ledger/references/` for the integrated workflow.
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

All operations are pure and immutable. The kernel refuses any unbalanced state.

See `examples/personal-ledger.ts` for a complete example.

## Common Patterns
- `Money.zero(currency)`, `from(value, currency)`, `add`/`sub`/`mul`/`div`/`allocate(ratios)`, `compare`, `convert(FXRate)` — `Money.from` rejects non-integer JS numbers (use strings for fractions); `FXRate` is exact, `convert` rounds to scale.
- `makeLine` + `createBalancedEntry` / `createEntry` (compound) / `createFxConversion(..., rate?)`.
- `validateEntry(entry)` (balance, scale, ISO dates, currency) + `ledger.apply(entry)`.
- `ledger.balance(account[, asOf, currency])`, `balancesByCurrency`, `verifyFundamentalEquation()`, `snapshot()`, `trialBalance()`. `balance()` fails closed on multi-currency accounts.
- `ledger.auditHash()` — SHA-256 chain over entries for tamper detection; `verifyDeterminism` compares hashes.
- Knowledge: `loadDefaultKnowledge()` + levers for GAAP/IFRS citations.
- Always prove with `validateEntry` + equation before use.

## Principles

- Zero-Skip Execution Protocol: nothing handwavy or lazy survives review
- Exact value, always (deterministic decimal arithmetic)
- Double-entry enforced at the kernel (GAAP/IFRS aligned)
- Immutability + provenance + full audit trail
- Graph-theory knowledge retrieval for targeted canon
- Fail closed. The Final Verification: "Was this lazy? Is this mathematically and structurally undeniable?"
- Minimal surface that still protects integrity

## AI Agent Integration

Load `AGENTS.md` (or `skills/ledger/SKILL.md`). Host adapters provided.

The agent becomes the Bean Counter:

- Executes Zero-Skip on every task
- Uses `Money` and `JournalEntry` exclusively (never floats)
- Grounds logic in canonical bodies of knowledge (GAAP/IFRS, tax, policy) and surfaces citations
- Proves invariants with `validateEntry` and `Ledger.apply` before output
- Uses graph-retrieved knowledge (levers) only when required

See commands in AGENTS.md.

## Verification

```bash
npm test
npm run verify
npm run verify:full
```

See AGENTS.md for development rules and persona updates.

## Development

When updating persona text (AGENTS.md, skills/*/SKILL.md, commands/*.toml, adapters), keep them consistent with the Zero-Skip rules and each other.

Run the verification harness:

```bash
npm run verify:full
```

The graphic (assets/bean-counter.jpg) exemplifies the Bean Counter; updates to it should preserve the high-contrast, exacting presence without adding explanatory prose about its style.

Keep distribution components (skills layout, toml commands, adapters) consistent for host use.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
