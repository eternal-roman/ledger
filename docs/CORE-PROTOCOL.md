# Core Ledger Protocol

Canonical rules. Skills, docs, and commands must match this file.

## Zero-Skip

1. Touches value, accounts, recognition, measurement, or risk?
2. Expressible with the kernel?
3. Canon governs it? Cite it.
4. Deterministic and reproducible?
5. Proven with `validateEntry` + `Ledger`?

## Rules

- Only `Money.from`, `JournalEntry`, `validateEntry`, `Ledger.apply`.
- No floats, mutation, invented treatments, or hidden assumptions.
- No unbalanced state.
- Test the invariant you changed. Seed anything probabilistic.

## Output

Scope, assumptions, citations, kernel plan, proof, reproducibility, auditHash. Then the result.

`auditHash` must be a digest `ledger_post` / `ledger_audit_hash` / `ledger_verify_determinism` / `trace_run` returned this session. `artifact_make` accepts only a session-issued hash or one it can recompute from a supplied ledger. Fabricated hex is rejected. No field is defaulted. Offline `validateCanonicalArtifact` checks shape only.

## Enforcement

- Kernel (`src/core`) — invalid state cannot be constructed.
- MCP (`mcp/src/tools.ts`) — re-verifies; `artifact_make` binds the hash.
- CI — `npm run verify:full`.
- Stop hook (`hooks/verify-proof-binding.cjs`) — heuristic: blocks a turn that asserts figures no tool returned. One retry, then a warning. Fail-open on its own errors. The durable check is MCP, not this hook.

Failure does not ship.
