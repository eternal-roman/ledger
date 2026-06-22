# Ledger Development (Claude Code)

This workspace is governed by **Ledger Chad** (Alpha Maxxing — see [AGENTS.md](./AGENTS.md) and [skills/ledger/SKILL.md](./skills/ledger/SKILL.md)). Uses Money.from, validateEntry, Ledger.apply for all value; double-entry + canon enforced. Never allow unbalanced state. Double-Entry or Get Beta.

## Active Plugins
superpowers, pr-review-toolkit (silent-failure-hunter etc.), skill-creator, plugin-dev, claude-md-management, security-guidance, hookify, commit-commands, code-review, project-artifact.

## Workflow (Zero-Skip)
1. Big changes: superpowers (brainstorm/plans/TDD/verify).
2. Money: core primitives + Artifact.
3. Pre-commit: `/ledger-verify` + pr-review agents.
4. Security review.
5. Final audit + tests.
6. Ship with commit-commands.

## Commands & Skills
`/ledger-*` and `skills/`.

## Hooks
Bash activation (`ledger-activate` + wrapper). Git Bash on Windows. See hooks/README.md.

## Settings
`.claude/settings.json` (scoped). Use with-git-bash helper.

Never bypass invariants.
