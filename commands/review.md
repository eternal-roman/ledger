# /ledger-review

Full financial + engineering review combining:

- Ledger kernel invariants (`/ledger-verify`, `/ledger-audit`)
- Superpowers structured verification
- pr-review-toolkit specialized agents
- Security guidance

**Usage**: Ask the agent to "run ledger-review on this diff" or "perform full bean counter review before PR".

This is the recommended gate before any commit that touches value, accounts, or financial logic.

See `skills/ledger-review/SKILL.md` for the detailed protocol.

