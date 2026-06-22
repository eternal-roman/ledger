# Hooks for Ledger (The Bean Counter)

This directory contains activation and other hooks for AI coding environments (primarily Claude Code / Codex-style hosts).

## Primary Implementation: Bash
- `ledger-activate` — extensionless bash script (recommended).
- `run-hook.cmd` — polyglot wrapper (cmd on Windows + bash on Unix). Locates Git Bash or `bash` on PATH.

This follows the cross-platform hook patterns from the **superpowers** plugin (installed component).

## Hook Registration
- `claude-codex-hooks.json` — Registers the SessionStart hook using the run-hook wrapper.
- On startup/resume, the bash script runs and prints the Bean Counter activation messages.

## Why Bash?
- Consistent Unix tooling (`grep`, `head`, `jq`, etc.) inside the agent context.
- Aligns with the majority of hooks in **superpowers**, **plugin-dev**, and **hookify**.
- Works excellently with Git for Windows (Git Bash) on this Windows machine.
- Reduces friction with pwsh (the previous default shell for some commands).

## Windows Setup Recommendation
1. Install **Git for Windows** (standard).
2. Ensure `bash` is on PATH (Git Bash usually adds `C:\Program Files\Git\bin`).
3. For the best experience, launch Claude Code (or your terminal) from **Git Bash** instead of PowerShell / pwsh.
   - This makes `run_terminal_command` (or equivalent) and hooks fully bash-native.
4. Optionally configure your editor/terminal profile to default to bash for this project.

## Fallbacks
- The old `ledger-activate.js` is retained for compatibility with pure-Node hook loaders.
- If no bash is found, the wrapper prints a helpful message and continues (rules still load via AGENTS.md / skills/).

## Reducing Friction on Windows
Use the helper from the repo root:

```powershell
# From pwsh or cmd
.\scripts\with-git-bash.cmd "npm test"
.\scripts\with-git-bash.cmd "./hooks/ledger-activate"
.\scripts\with-git-bash.cmd "git status"
```

Or from Git Bash:
```bash
./scripts/with-git-bash.sh "npm run verify:full"
```

Add `npm run with-bash` when inside a bash shell.

## Customization
Use **hookify** (installed) + **plugin-dev** (hook-development skill) to create additional PreToolUse / Stop / etc. hooks if needed.

Example trigger phrases for hook development:
"add a bash PreToolUse hook that validates Money usage"

## Testing
The hook runs automatically on SessionStart. You can manually test in bash:
```bash
./hooks/ledger-activate
```

See also: CLAUDE.md, AGENTS.md, docs/claude-plugins.md

