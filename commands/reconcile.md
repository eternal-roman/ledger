# /ledger-reconcile

Turn assumptions, rates, or policy impacts into proper journal entries with citations.

Usage in supported hosts:
Given free-text assumptions or a scenario:
1. Identify value, accounts, recognition, measurement, risk pricing touched.
2. Express using immutable kernel: `Money.from`, `createBalancedEntry` (or lines + validateEntry).
3. Use `/ledger-cite` with appropriate levers (e.g. {standard_family: ["IFRS"], domain: ["accounting"]}) to fetch canon.
4. Attach `citations` to the JournalEntry.
5. Apply via `Ledger.apply` and prove `verifyFundamentalEquation`.
6. Make all rates/jurisdictions/time explicit and traceable.
7. Output the entries + proof + sources. Never allow unbalanced state.

Example: revenue/lease assumptions → cite IFRS/GAAP → balanced entries with provenance.
