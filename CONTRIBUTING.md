# Contributing

Follow AGENTS.md strictly:

- Use Money.from, JournalEntry, validateEntry, Ledger.apply exclusively for value.
- No floats or native numbers for amounts.
- All entries must pass validateEntry and preserve fundamental equation.
- Add tests exercising kernel invariants.
- Prefer fewest lines.
- Cite canon where relevant.

Run `npm run verify:full` before PR.

See LEDGER-COMMERCIAL-GRADE-PLAN.md for roadmap.