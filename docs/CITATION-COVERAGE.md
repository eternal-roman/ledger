# Citation Coverage (Knowledge Graph Seeds)

Current seeds provide starter canon for IFRS + US-GAAP + basic instruments/tax.

## Key Levers Supported
- standard_family: ["IFRS", "GAAP", "US-TAX", "VALUATION", "FOMC", "MACRO"]
- domain: ["accounting", "revenue", "expense", "leases", "investing", "tax", "cost-basis", ...]
- jurisdiction, time_validity, asset_class

## Representative Nodes
See src/knowledge/seeds/*.ts for full list (conceptual framework, ASC 606, IFRS 15 5-step, ifrs15-5step, ifrs16-initial-liability, ias2-net-realizable, cost basis §1012, lot-relief-specific-id, IFRS 9, GIPS, matching principle details, etc.).

Starter set only. Always verify against official standards/law for production.

Citation tests = due diligence (see README Disclaimer + MIT LICENSE).

## Example lever queries (for /ledger-cite or direct fetch)
```ts
fetch(graph, 'revenue recognition', { standard_family: ['IFRS'], domain: ['revenue'] })
fetch(graph, 'lot relief', { domain: ['lot-relief'], jurisdiction: ['US'] })
```

Last seed update: 2026-06 (see ifrs.ts, gaap.ts, instruments.ts; added period-cutoff, closing-entries-re, ias21-foreign-currency-translation for new features).
