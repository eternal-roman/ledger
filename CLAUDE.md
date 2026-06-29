# Ledger Development (Claude Code)

This workspace is governed by strict Ledger kernel rules (see [AGENTS.md](./AGENTS.md) and [skills/ledger/SKILL.md](./skills/ledger/SKILL.md)). Use Money.from, validateEntry, Ledger.apply for all value; double-entry + canon enforced. Never allow unbalanced state.

## Active Plugins
host equivalents for planning/TDD/verification/review (e.g. superpowers-style or pr-review-toolkit-style when present), plus any skill/plugin helpers and security guidance.

See docs/CORE-PROTOCOL.md (Zero-Skip Execution Protocol defined there).

## Workflow (Zero-Skip)
1. Big changes: host equivalents (planning/TDD/verification/review agents or tools — examples include superpowers-style or pr-review-toolkit-style when present).
2. Money: core primitives + Artifact.
3. **Windows/pwsh**: Before any terminal or spawn_subagent: read ~/.grok/skills/pwsh-shell-guard/SKILL.md; include SUBAGENT SHELL GUARD BLOCK in prompts. Never emit | head etc in top-level cmd. Use Select-Object or with-git-bash.cmd wrapper.
4. Pre-commit: `/ledger-verify` + host review equivalents when present.
5. Security review.
6. Final audit + tests.
7. Ship with commit-commands (or host equivalent).

## Commands & Skills
`/ledger-*` and `skills/`.

## Hooks
Bash activation (`ledger-activate` + wrapper). Git Bash on Windows. See hooks/README.md.

## Settings
`.claude/settings.json` (scoped). Use with-git-bash helper.

Never bypass invariants.
