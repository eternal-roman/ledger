# Anti-patterns

## Float / literal math

```ts
// bad
const fee = parseFloat('1.23') * 0.01;
// good
const fee = Money.from('1.23', 'USD').mul('0.01');
```

`Money.from` rejects non-integer JS numbers.

## `+` / `-` on money

Use `Money.add` / `Money.sub` inside a `create*` helper, then `Ledger.apply`.

## Mutation

```ts
// bad
ledger.entries.push(e);
// good
ledger = ledger.apply(e).ledger;
```

## Hidden rates

Log the rate, cite it, attach both to `makeCanonicalArtifact`.

Catch 1–3 with `npx ledger-verify --scan .`.
