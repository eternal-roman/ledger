# Claude Code Plugin Setup

Ledger uses these plugins for strict standards:

- superpowers, pr-review-toolkit, skill-creator, plugin-dev, claude-md-management, security-guidance, hookify, commit-commands, code-review, project-artifact.

## Config
- `.claude/settings.json`, `CLAUDE.md`, `AGENTS.md`, `hooks/`.

## Workflow
superpowers → core primitives only → `/ledger-verify` or `/ledger-review` → pr-review agents → security → commit-commands.

## For Other Projects
Copy `AGENTS.md` or `skills/ledger/SKILL.md`. Use the `.claude-plugin/` manifest.

See AGENTS.md, CLAUDE.md, skills/.

## Shell
Bash-first hooks (Git Bash on Windows recommended). Use `.\scripts\with-git-bash.cmd "..."` from pwsh.

