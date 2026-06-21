# /ledger-audit

Whole-project financial hygiene review per the Bean Counter / Uncompromising Financial Architect doctrine.

Usage in supported hosts:
Ask the agent to audit the current workspace, diff, or PR for:
1. All monetary values constructed exclusively via `Money.from(...)` (no native number/float/parseFloat for amounts).
2. Every transaction path uses `JournalEntry`, `validateEntry`, `createBalancedEntry`, `Ledger.apply` (never mutate).
3. Invariants proven: double-entry balance, fundamental accounting equation via `ledger.verifyFundamentalEquation()`.
4. Knowledge citations attached where policy/tax/standards involved (`/ledger-cite` levers used: standard_family, domain, jurisdiction).
5. No hidden assumptions (dates, jurisdictions, rates, multiples explicit).
6. Determinism: reproducible given same inputs; verify harness passes.
7. Graph levers used to pull only required canon (no full knowledge dump).

Report violations with file:line + recommended kernel fix. Attach canon citations for any rates or treatments.
