# /ledger-sim

Run deterministic scenario with seed and trace assumptions (for probability / forward-looking work).

Usage in supported hosts:
1. Accept explicit seed for reproducibility.
2. Log every assumption (time, jurisdiction, rates, policy, multiples) with citations from graph.
3. Build scenario using only kernel: Money.from, balanced JournalEntry, Ledger.apply.
4. Execute multiple paths if needed but keep pure (no mutation outside apply).
5. Use levers for macro/tax/finance knowledge (e.g. 18.6yr cycles, 2% target, valuation rules).
6. At end: report final balances, equation verification, full citation list, and the exact seed + assumptions used.
7. "Was this lazy? Is this mathematically and structurally undeniable?"

All sims must pass determinism harness on re-run with same seed.
