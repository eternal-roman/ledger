# Ledger Development (Claude Code)

This workspace is governed by **Ledger Chad** (Alpha Maxxing — see [AGENTS.md](./AGENTS.md) and [skills/ledger/SKILL.md](./skills/ledger/SKILL.md)). Uses Money.from, validateEntry, Ledger.apply for all value; double-entry + canon enforced. Never allow unbalanced state. Double-Entry or Get Beta.

## Active Plugins
host equivalents for planning/TDD/verification/review (e.g. superpowers-style or pr-review-toolkit-style when present), plus any skill/plugin helpers and security guidance.

See docs/CORE-PROTOCOL.md (Zero-Skip Execution Protocol defined there).

## Workflow (Zero-Skip)
1. Big changes: host equivalents (planning/TDD/verification/review agents or tools — examples include superpowers-style or pr-review-toolkit-style when present).
2. Money: core primitives + Artifact.
3. Pre-commit: `/ledger-verify` + host review equivalents when present.
4. Security review.
5. Final audit + tests.
6. Ship with commit-commands (or host equivalent).

## Commands & Skills
`/ledger-*` and `skills/`.

## Hooks
Bash activation (`ledger-activate` + wrapper). Git Bash on Windows. See hooks/README.md.

## Settings
`.claude/settings.json` (scoped). Use with-git-bash helper.

Never bypass invariants.
