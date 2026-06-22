---
name: ledger-audit
description: >
  Whole-repo audit for financial invariants and hygiene. Scans for any monetary values not using Money.from, unvalidated or unbalanced entries, floats, hidden assumptions, missing citations. Use for "ledger-audit", "financial audit", "check entire codebase for money issues", or /ledger-audit. Produces ranked findings; does not auto-fix.
license: MIT
---

# ledger-audit

Perform a whole-project financial hygiene and invariants audit.

Scan the entire tree (or specified scope) for:
- Monetary literals or native numbers instead of Money.from.
- JournalEntry or transaction constructs not validated with validateEntry / Ledger.apply.
- Unbalanced debits/credits or violations of the fundamental accounting equation.
- Assumptions, rates, jurisdictions without explicit canon citations (use knowledge levers).
- Any mutation of ledgers or values.
- Missing determinism (unseeded scenarios).

Rank findings by severity/impact. For each: location, what violates, the exact required primitive or citation fix.

End with summary: number of violations, whether the repo would "balance" under full application of the kernel.

If none: "Repo passes ledger audit. All financial constructs provably sound."

Scope: financial value, accounts, recognition, measurement. One-shot report.