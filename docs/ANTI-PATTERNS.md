# Ledger Anti-Patterns (with grounded fixes)

## 1. Native float / literal arithmetic
Bad:
```ts
const fee = parseFloat('1.23') * 0.01;
total += fee;
```
Error you will hit (or should): `Money.from: non-integer number ...` (src/core/money.ts:90).

Good:
```ts
const fee = Money.from('1.23', 'USD').mul('0.01');
const e = createBalancedEntry(id, date, feeAcct, cash, fee, 'fee');
l = l.apply(e).ledger;
```

## 2. Direct +/- on money variables
Bad: `balance = balance + amount;`

Good: use `Money.add` inside `create*` + `Ledger.apply`.

## 3. Mutation
Bad: `ledger.entries.push(e);`

Good: `ledger = ledger.apply(e).ledger;`

## 4. Hiding rates/assumptions
Bad: hard-coded 0.05 with no citation.

Good: `assumptions: ['rate=0.05 from policy doc X 2026-06'], citations: [from ledger-cite or graph]`, then `makeCanonicalArtifact`.

Run `npx tsx scripts/ledger-verify.ts --scan .` to catch 1-3 mechanically.
