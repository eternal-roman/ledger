# Ledger Development (Claude Code)

This workspace is governed by the **Bean Counter** (see [AGENTS.md](./AGENTS.md) and [skills/ledger/SKILL.md](./skills/ledger/SKILL.md)).

## Active Plugins (project + user)
- **superpowers** — Structured workflows (brainstorm → write-plans → test-driven-development → verification-before-completion)
- **pr-review-toolkit** — Specialized agents: `silent-failure-hunter`, `type-design-analyzer`, `pr-test-analyzer`, `code-simplifier`, `code-reviewer`
- **skill-creator** — For authoring and improving custom skills
- **plugin-dev** — For hooks, commands, agents, skills structure
- **claude-md-management** — Maintain AGENTS.md / CLAUDE.md quality
- **security-guidance** — Continuous security review on edits
- **hookify** — Hook authoring
- **commit-commands** — `commit`, `commit-push-pr`, `clean_gone`
- **code-review** — General review command
- **project-artifact** — Living status pages for complex workstreams

## Required Workflow (Zero-Skip + Plugins)
1. **Big changes or new financial features**: Start with superpowers (brainstorming or write-plans).
2. **Any money logic**: Follow the Canonical Financial Artifact contract from AGENTS.md. Use core primitives only.
3. **Before committing**: Run `/ledger-verify` (or the skill). Then trigger pr-review-toolkit agents (especially silent-failure-hunter + type-design-analyzer).
4. **Security-sensitive**: security-guidance hooks run automatically; review findings.
5. **Final review**: Use ledger-audit + full test + verify harness.
6. **Ship**: Use commit-commands.

## Custom Commands & Skills
- `/ledger-verify`, `/ledger-audit`, `/ledger-cite`, `/ledger-reconcile`, `/ledger-sim`
- All skills in `skills/` are active when relevant topics appear.
- Project commands in `commands/`.

## Hooks
SessionStart loads the Ledger persona and rules via the **bash** implementation:
- `hooks/ledger-activate` (primary, extensionless bash script)
- `hooks/run-hook.cmd` (polyglot wrapper following superpowers patterns)

This provides consistent bash behavior even on Windows (via Git Bash).

**Recommendation**: Launch Claude Code from Git Bash (instead of pwsh/PowerShell) for this project. This eliminates PowerShell friction for hooks and for commands the agent runs (grep, head, etc. become native).

When stuck in pwsh: `.\scripts\with-git-bash.cmd "your command"`

See `hooks/README.md` for setup.

## Project Settings
See `.claude/settings.json` for scoped permissions (strict on dist/node_modules, broad Bash for dev commands).

Use `.\scripts\with-git-bash.cmd "..."` or Git Bash to avoid pwsh issues when running commands.

Never bypass invariants. Failure does not ship. Balance the books.
