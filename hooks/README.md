# Hooks for Ledger (Ledger Chad — Alpha Maxxing)

Bash-first activation hooks for AI hosts (Claude Code etc.). Enforces Money.from, double-entry via validateEntry + Ledger.apply, canon, Zero-Skip. No unbalanced state. Double-Entry or Get Beta.

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

