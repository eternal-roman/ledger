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
`ledger_verify_determinism` / `trace_run` call returned this session. `artifact_make` enforces
this, not just its format: it accepts only a hash the server itself issued this session, or one it
can recompute from a serialized `ledger` passed alongside — free text and fabricated-but-well-formed
values are both rejected. No field is silently defaulted (a caller must supply real citations and a
real kernel plan, not an assumed one). The offline kernel validator
(`validateCanonicalArtifact`) checks shape only; session binding lives in the MCP layer.

## Enforcement layers
- Kernel (`src/core`): fail-closed by construction — invalid entries cannot be constructed or
  deserialized.
- MCP tools (`mcp/src/tools.ts`): fail-closed adapters; every ledger-returning tool re-verifies via
  the kernel before responding, and `artifact_make` binds artifacts to session-issued hashes.
- CI (`npm run verify:full`): fail-closed, non-LLM (`scripts/ledger-verify.ts`,
  `scripts/verify-determinism.ts`).
- Claude Code Stop hook (`hooks/verify-proof-binding.cjs`, registered via `hooks/claude-code-hooks.json`
  and `.claude-plugin/plugin.json`'s `"hooks"` field — file-split rationale in `hooks/README.md`):
  a heuristic backstop that blocks a turn whose final message asserts figures no ledger tool
  returned. It blocks once per turn (a mismatch that survives the retry ships with a visible
  warning instead of looping) and fails open on its own infrastructure failures — the durable,
  non-bypassable binding is the MCP layer above, not this hook.

Failure does not ship. All operations must be exact, balanced, and kernel-enforced.
