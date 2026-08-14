# 5-minute start

## Agent

```bash
npx -y @eternal-roman/ledger-mcp
```

Read `AGENTS.md`. Compute with `money_compute`. Post with `ledger_post`. Prove with `ledger_verify_equation`.

Or install the plugin (`grok plugin install /path/to/ledger --trust`) and run `/ledger-verify`.

## Library

```bash
npm install @eternal-roman/ledger
```

```ts
import { Money, Account, AccountType, createBalancedEntry, emptyLedger, validateEntry } from '@eternal-roman/ledger';

const checking = new Account('100', 'Checking', AccountType.Asset);
const equity = new Account('300', 'Equity', AccountType.Equity);
const e = createBalancedEntry('cap', '2026-06-21', checking, equity, Money.from('10000', 'USD'), 'Seed');
if (!validateEntry(e).ok) throw new Error('rejected');
const ledger = emptyLedger().apply(e).ledger;
ledger.verifyFundamentalEquation(); // true
```

Mechanical check:

```bash
npx ledger-verify --scan .
```

Then `docs/SUCCESS-CHECKLIST.md` and `docs/ANTI-PATTERNS.md`.
