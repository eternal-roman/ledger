# Citation coverage

Starter IFRS + US-GAAP + instruments/tax seeds. Not a full canon. Verify against official text.

Levers: `standard_family` (IFRS, GAAP, US-TAX, VALUATION, FOMC, MACRO), `domain`, `jurisdiction`, `time_validity`, `asset_class`.

```ts
fetch(graph, 'revenue recognition', { standard_family: ['IFRS'], domain: ['revenue'] })
fetch(graph, 'lot relief', { domain: ['lot-relief'], jurisdiction: ['US'] })
```

Nodes live in `src/knowledge/seeds/`.
