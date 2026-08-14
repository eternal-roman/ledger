# Before shipping value code

- Amounts: `Money.from("…", "CUR")` (strings for fractions).
- Movement: `JournalEntry` / `createBalancedEntry` / `fillToEntries` — never raw arithmetic.
- `validateEntry(entry).ok` (or a helper that throws).
- `ledger = ledger.apply(e).ledger` — do not mutate.
- Non-trivial work: `makeCanonicalArtifact` with a real `auditHash` (from `runTrace` / `Ledger.auditHash`). Every field required.
- Prove: equation + `auditHash` (+ `runTrace` / `verifyDeterminism` when the path is non-trivial).
- `npx ledger-verify --scan .` before the PR.
- Rates, dates, jurisdiction, policy: explicit and cited.

If any item fails, do not ship.
