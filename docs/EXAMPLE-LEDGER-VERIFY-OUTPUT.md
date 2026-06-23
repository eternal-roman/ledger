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
/tmp/bad.ts:1: PARSE_FLOAT — use Money.from("123.45", "USD") — never parseFloat for monetary values (see src/core/money.ts)
/tmp/bad.ts:1: const f = parseFloat("1.23"); const t = 100.5 + 0.01;
 /tmp/bad.ts:1: FLOAT_LITERAL — use Money.from("123.45", "USD") — pass string for any fractional amount (see Money.from in src/core/money.ts:86)
/tmp/bad.ts:1: const f = parseFloat("1.23"); const t = 100.5 + 0.01;
Exit 1
```

Matches the exact phrasing required by skills/ledger-verify/SKILL.md.
