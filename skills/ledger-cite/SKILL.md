---
name: ledger-cite
description: >
  Look up IFRS/GAAP citations from the ledger knowledge graph. Use for ledger-cite,
  "what's the IFRS rule for", "GAAP citation", revenue recognition, leases, cost basis,
  or /ledger-cite. Never invent a standard paragraph.
license: MIT
---

# ledger-cite

Use the ledger knowledge graph to fetch canon facts for a concept.

Examples of levers (current seeds cover IFRS + US-GAAP accounting):
- {standard_family: ["IFRS"], domain: ["accounting"]}
- {standard_family: ["GAAP"], domain: ["revenue"]}

See docs/CITATION-COVERAGE.md for full current coverage matrix, lever examples, and disclaimer (starter set; supplement with official standards).

Return exact fact/rule + source + traceability + usage (e.g. in entry comment).

Always attach to Money/validated entries. Never guess.

If no match: note needed context (jurisdiction, date).