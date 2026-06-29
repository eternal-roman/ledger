# Security

Ledger uses exact arithmetic (decimal.js) and enforces invariants at construction time via validateEntry and Ledger.apply.

Report vulnerabilities via GitHub issues with "financial invariant violation" label or security contact if available.

No external dependencies beyond decimal.js for core math.

**Note:** Verification and adversarial tests (kernel + MCP) provide due diligence. See Disclaimer in README.md + MIT LICENSE for legal terms.