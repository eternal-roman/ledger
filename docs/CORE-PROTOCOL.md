# Core Ledger Protocol (Single Source of Truth)

This block is the canonical definition. All persona files, skills, docs, and commands must stay consistent with it.

## Zero-Skip Execution Protocol
1. Touches value, accounts, recognition, measurement, or risk pricing?
2. Expressible with the immutable kernel?
3. Canon fact (or knowledge) governs it? Cite it.
4. Deterministic and reproducible?
5. Invariants preserved? Prove with `validateEntry` + `Ledger`.

## Non-negotiable Rules
- Core primitives only (`Money.from`, `JournalEntry`, `validateEntry`, `Ledger.apply`).
- No floats, no mutation, no invented treatments, no hidden assumptions.
- Never allow unbalanced state.
- Fewest lines + tests for invariants. Seed probabilistic work.

## Output Contract
Scope, Assumptions, Citations, Kernel Plan, Proof, Reproducibility, AuditHash. Then code. Use
/ledger-verify or `npm run verify:ledger`.

The AuditHash must be the exact SHA-256 digest a real `ledger_post` / `ledger_audit_hash` /
`ledger_verify_determinism` call returned this session — `artifact_make` rejects free text or a
fabricated value here, and no field is silently defaulted (a caller must supply real citations and
a real kernel plan, not an assumed one).

## Enforcement layers
- Kernel (`src/core`): fail-closed by construction — invalid entries cannot be constructed or
  deserialized.
- MCP tools (`mcp/src/tools.ts`): fail-closed adapters; every ledger-returning tool re-verifies via
  the kernel before responding.
- CI (`npm run verify:full`): fail-closed, non-LLM (`scripts/ledger-verify.ts`,
  `scripts/verify-determinism.ts`).
- Claude Code Stop hook (`hooks/verify-proof-binding.cjs`, registered via the `Stop` key in
  `hooks/hooks.json` so it ships with the plugin): fail-closed on a detected mismatch between the
  assistant's final message and real tool output, fail-open on its own infrastructure failures.
  This is what makes AI *engagement* with the kernel accountable, not just the kernel's own math —
  see `hooks/README.md`.

Failure does not ship. All operations must be exact, balanced, and kernel-enforced.
