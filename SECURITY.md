# Security

Ledger uses exact arithmetic (decimal.js) and enforces invariants at construction
time via `validateEntry` and `Ledger.apply` (fail-closed: invalid state is never
posted). The only runtime dependency for core math is decimal.js.

## Reporting a vulnerability

Please report suspected vulnerabilities **privately** via GitHub Security
Advisories — use "Report a vulnerability" on the repository's **Security** tab —
rather than opening a public issue. For integrity bugs, describe the broken
invariant (e.g. an unbalanced ledger that posts, a tamper that does not change the
audit hash, a non-finite amount that validates). We aim to acknowledge within a
few days.

## Integrity model

- Determinism and tamper-evidence are verified mechanically by the kernel + MCP
  test suites and `npm run verify:full`.
- The audit-hash chain (`ledger-audit-v2`) covers each entry's id / effective date
  / description and, per line, side / account code / account **type** / account
  **name** / amount / tags (tag key order canonicalized). Any change to those
  fields changes the digest.
- Account identity is enforced: a code cannot be redefined with a different type
  or name (`ACCOUNT_REDEFINED`), so balances and the fundamental equation cannot
  be silently corrupted.

## Release signing

Releases are tagged locally with signed annotated git tags (`git tag -s`) when the
environment allows. When a signed-tag push is blocked, CI creates an **unsigned**
fallback tag plus the GitHub Release object — so signature presence is best-effort
and is **not** currently a hard supply-chain guarantee. Verify provenance via the
published commit SHA and the GitHub Release. Enforced artifact signing (e.g. npm
provenance / sigstore) is a tracked follow-up.

**Note:** Verification and adversarial tests (kernel + MCP) provide due diligence.
See the Disclaimer in README.md and the MIT LICENSE for legal terms.
