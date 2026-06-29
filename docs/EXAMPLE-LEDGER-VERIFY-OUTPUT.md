# Example ledger-verify Output

## Clean (on examples/)
```
npx tsx scripts/ledger-verify.ts --scan examples
Ledger clean. Invariants hold.
```

## Violation (synthetic)
```
$ echo 'const f = parseFloat("1.23"); const t = 100.5 + 0.01;' > /tmp/bad.ts
$ npx tsx scripts/ledger-verify.ts --scan /tmp/bad.ts
L1: PARSE_FLOAT — use Money.from("123.45", "USD") — never parseFloat for monetary values
    in /tmp/bad.ts
    const f = parseFloat("1.23"); const t = 100.5 + 0.01;
L1: FLOAT_LITERAL — use Money.from("123.45", "USD") — pass string for any fractional amount
    in /tmp/bad.ts
    const f = parseFloat("1.23"); const t = 100.5 + 0.01;
Exit 1
```

Matches the exact phrasing required by skills/ledger-verify/SKILL.md.
