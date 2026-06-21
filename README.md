# Ledger

**Ledger — The Uncompromising Financial Architect**  
**The Bean Counter**  
*He says nothing. He balances the books to the penny. Mistakes do not leave the building.*

Ledger is the canonical library + AI guardrails package for architecting, evaluating, and building financial, accounting, investing, and tax software components with flawless precision.

Where other systems cut corners, Ledger builds vaults. It guarantees every component is structurally sound, mathematically deterministic, and anchored in institutional-grade best practices.

**Cartoon Stereotype:** Ledger is depicted as a black-and-white, layered Family Guy style cartoon character — a gaunt, middle-aged accountant with a permanent scowl, thick horn-rimmed glasses, receding hairline, wearing a rumpled dress shirt with rolled sleeves and suspenders, a loosened striped tie, and a classic green eyeshade pulled low. One hand clutches a massive leather-bound ledger; the other grips a red mechanical pencil. Sharp bold outlines, high-contrast ink, subtle cross-hatch layering for depth and cel-shaded planes. Pure monochrome line art with no color fills.

It makes structural and functional integrity **impossible to violate** by accident:

- Exact decimal arithmetic (never floats)
- Enforced double-entry + accounting equation (GAAP/IFRS)
- Immutable append-only ledgers with full audit
- Deterministic, reproducible by default
- Zero-Skip Execution: Plan & Unpack, Gap Analysis, complete Artifact (build plan) before any production code
- Grounded in canonical bodies of knowledge: Accounting & Banking, Finance & Capital Management, Economics & Public Policy, Tax & Estate Law
- Graph-theory knowledge retrieval: levers fetch only the required rules and canon on demand
- AI agents are forced to act like the unforgiving bean counter

## Install

```bash
npm install ledger
```

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
  Money.from(10000, 'USD'),
  'Initial capital'
);

const result = validateEntry(contribution);
if (!result.ok) throw new Error('Invariant violation');

let ledger = emptyLedger().apply(contribution).ledger;

console.log(ledger.balance(cash).toString()); // "10000.00 USD"
```

All operations are pure and immutable. The kernel will refuse any unbalanced state.

See `examples/personal-ledger.ts` for a complete working example.

## AI Agent Integration

Copy or load `AGENTS.md` into your agent context (or install the plugin/skill package for your host).

The agent becomes **The Bean Counter** (Ledger — The Uncompromising Financial Architect):
- Executes the Zero-Skip Execution Protocol on every task (Plan & Unpack → Gap Analysis → complete Artifact)
- Uses `Money` and `JournalEntry` exclusively; never floats
- Grounds logic in canonical bodies of knowledge (GAAP/IFRS, tax law, macro policy) and surfaces citations
- Proves invariants with `validateEntry` and `Ledger.apply` before any output
- Uses graph-retrieved knowledge (levers / dimensions) only when required

Commands (when supported by host):
- `/ledger-verify`
- `/ledger-audit`
- `/ledger-cite`
- `/ledger-reconcile`
- `/ledger-sim`

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

## License

MIT

Built so that financial mistakes simply do not happen. Balance the books.
