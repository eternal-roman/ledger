# Claude Code Plugin Setup for Ledger Development

This project is optimized for a specific set of Claude Code plugins that reinforce its strict financial engineering standards.

## Required / Recommended Plugins (installed at project scope)
- superpowers
- pr-review-toolkit
- skill-creator
- plugin-dev
- claude-md-management
- security-guidance
- hookify
- commit-commands
- code-review
- project-artifact

## Local Configuration
- `.claude/settings.json`: Permissions scoped to source, tests, skills, docs. Denies mutation of build artifacts.
- `CLAUDE.md`: Workspace-specific instructions + plugin usage.
- `AGENTS.md`: The canonical Bean Counter persona (shipped to consumers too).
- `hooks/`: SessionStart activation of ledger rules (also works when the package is consumed as a plugin).

## Integrated Workflow
1. Use superpowers for any feature or significant change.
2. Implement using only ledger core primitives.
3. Gate with `/ledger-verify` or the new `/ledger-review`.
4. Run pr-review-toolkit agents (focus on silent failures and types).
5. Respect security-guidance.
6. Commit via commit-commands.

## Adding the Ledger Persona to Other Projects
For other codebases:
- Copy AGENTS.md or load `skills/ledger/SKILL.md`
- For full marketplace support: add this repo via the .claude-plugin/ manifest.

See also: AGENTS.md, CLAUDE.md, skills/, commands/.

## Shell Recommendation (Bash over PowerShell)
This project has moved to **bash-based hooks** following patterns from the installed **superpowers** plugin (and plugin-dev hook-development guidance).

- Primary hook: `hooks/ledger-activate` (bash, no extension)
- Wrapper: `hooks/run-hook.cmd` (polyglot for Windows cmd + bash)
- Registration: `hooks/claude-codex-hooks.json` now calls the wrapper

**To eliminate PowerShell (pwsh) friction completely for agent work:**

- On Windows: Use **Git Bash** (from Git for Windows) as your primary shell when working on this project.
- Launch the `claude` CLI from Git Bash.
- Unix tools (`grep`, `head`, `tail`, `find`, etc.) then work natively inside the agent and in your terminal.
- Use the repo helper when you must stay in pwsh:
  ```powershell
  .\scripts\with-git-bash.cmd "npm run verify:full"
  .\scripts\with-git-bash.cmd "./hooks/ledger-activate"
  ```
- The old `ledger-activate.js` remains only as a fallback.

See `hooks/README.md` for full details and testing instructions.

This change makes the environment consistent with how most of the recommended plugins (superpowers, plugin-dev, etc.) author their hooks.

