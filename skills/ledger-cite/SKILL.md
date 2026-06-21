---
name: ledger-cite
description: >
  Retrieve precise canon-backed facts, rates, policy, or accounting treatments using the knowledge graph levers (standard_family, domain etc.). Returns citable material for attaching to entries or code. Use with "ledger-cite", "find the IFRS rule for", "FOMC citation for", or /ledger-cite.
license: MIT
---

# ledger-cite

Use the ledger knowledge graph to fetch canon facts for a concept.

Examples of levers:
- {standard_family: ["IFRS"], domain: ["accounting"]}
- {standard_family: ["FOMC"], domain: ["monetary_policy"]}
- {standard_family: ["GAAP"], domain: ["revenue"]}

Return:
- The exact fact, rule, or treatment.
- Source identifier and traceability.
- How to apply it (e.g. in a JournalEntry comment or assumption log).

Always surface for use with Money and validated entries. Never guess rates or treatments.

If no matching lever data, state what additional context (jurisdiction, date) is needed.