# /ledger-audit

**Adversarial, kernel-powered, transaction-trace-enforced whole-repo financial invariants audit (10x potency).**

Execute the complete SUPER_LEDGER_AUDIT_PROTOCOL in docs/SUPER_LEDGER_AUDIT_PROTOCOL.md.

Non-negotiable:
- Canonical bootstrap + proven determinism/equation FIRST (use reference for Python or other langs).
- Exhaustive scanner-driven inventory (>=120 expressions).
- Every money lifecycle rebuilt as JournalEntry seqs + replayed via immutable Ledger.apply + per-step proofs (balances, equation, hash).
- Numeric side-by-side counterexamples, drift sims, fuzzer attacks.
- Self-attack + meta review.
- All artifacts (traces, recon, reports, enforcement code) + filled ENFORCER_VERIFICATION block.

Findings must cite exact file:line, numeric delta, hardened kernel replacement, and decision impact. Never surface-scan only. Use the kernel strength for tracing.

Complements /ledger-review (run after or in composition). Always gate on ledger layer.
