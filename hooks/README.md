# Hooks for Ledger (The Bean Counter)

Bash-first activation hooks for AI hosts (Claude Code etc.).

## Files
- `ledger-activate` — primary bash script.
- `run-hook.cmd` — Windows wrapper (Git Bash + cmd).
- `claude-codex-hooks.json` — SessionStart registration.

## Setup (Windows)
Use Git Bash. Launch from Git Bash or use:
```powershell
.\scripts\with-git-bash.cmd "command"
```

Fallback: `ledger-activate.js`.

## Customization
See hookify + plugin-dev.

See CLAUDE.md, AGENTS.md, docs/claude-plugins.md.

