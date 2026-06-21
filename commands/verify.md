# /ledger-verify

Usage in supported hosts:

Ask the agent to run ledger verification on the current diff, file, or snippet.

The agent must:
1. Parse for any monetary amounts and force Money.from usage.
2. Construct JournalEntry(s) where possible.
3. Call validateEntry / Ledger.apply.
4. Report any violations with proof.
5. Surface required canon context if rules are involved.
