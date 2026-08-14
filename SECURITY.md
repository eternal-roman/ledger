# Security

Fail-closed kernel (`validateEntry`, `Ledger.apply`). Core math depends only on decimal.js.

## Report

Use GitHub Security Advisories, not a public issue. For integrity bugs, name the broken invariant (unbalanced post, unchanged hash after tamper, non-finite amount that validates).

## Integrity

- `npm run verify:full` plus kernel/MCP tests.
- `ledger-audit-v2` hashes id, date, description, and per line: side, code, **type**, **name**, amount, tags (keys sorted).
- A code cannot change type or name (`ACCOUNT_REDEFINED`).

## Signing

Local `git tag -s` when possible. If that push is blocked, CI may create an **unsigned** tag. Signature is best-effort, not a supply-chain guarantee. Trust the commit SHA and a non-draft GitHub Release. npm provenance is follow-up.

See README disclaimer and LICENSE.
