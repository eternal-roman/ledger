---
name: ledger-cite
description: >
  Retrieve precise canon-backed accounting facts using the knowledge graph levers (standard_family, domain etc.). Seeds cover IFRS + US-GAAP. Returns citable material for attaching to entries or code. Use with "ledger-cite", "find the IFRS rule for", "GAAP citation for", or /ledger-cite.
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