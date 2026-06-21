# Ledger

**The Bean Counter.**  
*He says nothing. He balances the books to the penny. Mistakes do not leave the building.*

Ledger is the canonical library + AI guardrails package for building reliable money, accounts, and financial systems the same way, every time.

It makes structural and functional integrity **impossible to violate** by accident:

- Exact decimal arithmetic (never floats)
- Enforced double-entry + accounting equation
- Immutable append-only ledgers with full audit
- Deterministic, reproducible by default
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

The agent becomes **The Bean Counter**:
- Uses `Money` and `JournalEntry` exclusively
- Proves invariants before emitting financial logic
- Surfaces citations when drawing on policy or standards

Commands (when supported by host):
- `/ledger-verify`
- `/ledger-audit`
- `/ledger-cite`

## Determinism & Verification

```bash
npm test
npm run verify   # determinism harness
npm run build
```

Property-based tests + explicit reproducibility checks are part of the package.

## Principles

- Exact value, always
- Double-entry enforced at the kernel
- Immutability + provenance
- Fail closed
- Minimal surface that still protects integrity

## License

MIT

Built so that financial mistakes simply do not happen.
