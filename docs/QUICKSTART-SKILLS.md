# 5-Minute Ledger Skills + Kernel Enforcement

1. Make the rules visible: copy `AGENTS.md` (or `skills/ledger/SKILL.md`) into your project root, or `grok plugin install /path/to/ledger --trust`.
2. Depend on the library: `npm install file:/absolute/path/to/ledger` (or packed tarball / git dep). Then:
   ```ts
   import { Money, Account, AccountType, createBalancedEntry, emptyLedger, validateEntry } from 'ledger';
   ```
3. Always:
   - `Money.from("123.45", "USD")` (string for fractions).
   - Build with `createBalancedEntry(...)` or `createEntry` + `makeLine`.
   - Call `validateEntry(e)` (or let the create helpers do it).
   - `let l = emptyLedger(); l = l.apply(e).ledger;`
   - `l.verifyFundamentalEquation()` and `l.auditHash()`.
4. Mechanical check (standalone, no LLM):
   ```bash
   npx tsx node_modules/ledger/scripts/ledger-verify.ts --scan src
   # or after wiring: npx ledger-verify --scan .
   ```
5. For scenarios/assumptions → entries: use the pattern in `examples/personal-ledger.ts` + `/ledger-reconcile` (agent) or direct kernel calls. Attach citations from the graph when rates/policy apply.

Example minimal correct snippet (from examples/personal-ledger.ts):
```ts
const checking = new Account('100', 'Checking', AccountType.Asset);
const equity = new Account('300', 'Equity', AccountType.Equity);
const e = createBalancedEntry('cap', '2026-06-21', checking, equity, Money.from('10000', 'USD'), 'Seed');
const res = validateEntry(e);
let ledger = emptyLedger().apply(e).ledger;
console.log(ledger.verifyFundamentalEquation()); // true
```

See `docs/SUCCESS-CHECKLIST.md`, `docs/ANTI-PATTERNS.md`, and `docs/SCOPE-AND-LAYERS.md`.
