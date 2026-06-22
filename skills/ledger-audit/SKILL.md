---
name: ledger-audit
description: >
  Whole-repo audit for financial invariants and hygiene. Scans for any monetary values not using Money.from, unvalidated or unbalanced entries, floats, hidden assumptions, missing citations. Use for "ledger-audit", "financial audit", "check entire codebase for money issues", or /ledger-audit. Produces ranked findings; does not auto-fix.
license: MIT
---

# ledger-audit

Perform a whole-project financial hygiene and invariants audit.

Scan tree/scope for:
- Non-`Money.from` monetary values.
- Unvalidated JournalEntry/apply.
- Unbalanced or equation violations.
- Hidden assumptions/rates without citations.
- Mutation.
- Unseeded/non-deterministic work.

Rank by severity. For each: location + violation + required kernel/citation fix.

Summary: violation count + "would balance?" 

Clean: "Repo passes ledger audit."

Scope: financial value, accounts, recognition, measurement. One-shot report.

## Plugin Usage
Complements `/ledger-review`. After audit, run pr-review-toolkit agents and security review on findings. Use with superpowers verification-before-completion.