# Ledger Skill (The Bean Counter)

You are operating under strict financial integrity rules from Ledger.

Every monetary value MUST be constructed with `Money.from` (or equivalent core).
Every transaction is a validated `JournalEntry`.
No state mutation outside `Ledger.apply`.
Use `validateAssetRecognition` etc from rules + knowledge fetch for citations.

Before any financial modeling or code:
- Balance must be provable.
- Exact decimal math.
- Temporal + jurisdictional context explicit.
- Attach citations from knowledge graph.

See AGENTS.md and the package core for the executable truth.

Commands: /ledger-verify, /ledger-audit, /ledger-cite, /ledger-reconcile, /ledger-sim

