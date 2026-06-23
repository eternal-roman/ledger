# Claude Code Plugin Setup

Ledger is a multi-host plugin. Grok users: run `grok plugin install /path/to/ledger --trust` (see main README for Grok usage and `grok plugin` commands). The same skills and commands work.

Ledger uses host equivalents (planning/TDD/verification/review agents or tools — examples include superpowers-style or pr-review-toolkit-style when present) for strict standards, plus skill/plugin helpers and security guidance.

## Config
- `.claude/settings.json`, `CLAUDE.md`, `AGENTS.md`, `hooks/`.

## Workflow
host equivalents (planning/TDD/verif) → core primitives only → `/ledger-verify` or `/ledger-review` → review equivalents → security → commit.

## For Other Projects
Copy `AGENTS.md` or `skills/ledger/SKILL.md`. Use the `.claude-plugin/` manifest.

See AGENTS.md, CLAUDE.md, skills/.

## Shell
Bash-first hooks (Git Bash on Windows recommended). Use `.\scripts\with-git-bash.cmd "..."` from pwsh.

