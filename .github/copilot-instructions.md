Follow AGENTS.md and skills/ledger/SKILL.md.

- Import from `@eternal-roman/ledger` or `@eternal-roman/ledger/core`.
- Every monetary value: `Money.from('...')`.
- Every movement: `JournalEntry` → `validateEntry` → `Ledger.apply`.
- Prove double-entry balance and `verifyFundamentalEquation()`.
- Rates, dates, jurisdiction, and policy are explicit and cited.
- Zero-Skip + Canonical Financial Artifact before financial modeling.

See `commands/` for `/ledger-*`. Failure does not ship.
