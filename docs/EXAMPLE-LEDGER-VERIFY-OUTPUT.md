# ledger-verify output

Clean:

```
npx ledger-verify --scan examples
Ledger clean. Invariants hold.
```

Violation:

```
$ npx ledger-verify --scan bad.ts
L1: PARSE_FLOAT — use Money.from("123.45", "USD") — never parseFloat for monetary values
L1: FLOAT_LITERAL — use Money.from("123.45", "USD") — pass string for any fractional amount
Exit 1
```
