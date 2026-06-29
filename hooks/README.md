# Hooks for Ledger

Activation hooks (best-effort) for AI hosts. The real rules live in AGENTS.md + skills/ledger/SKILL.md. Slash commands and skills work independently of hooks. Enforces Money.from, double-entry via validateEntry + Ledger.apply, canon, Zero-Skip. No unbalanced state.

## Files
- `hooks.json` — Grok-native (and compatible) SessionStart. Uses `GROK_PLUGIN_ROOT` + `CLAUDE_PLUGIN_ROOT`.
- `claude-codex-hooks.json` — Claude/Codex compat SessionStart (points at run-hook.cmd).
- `ledger-activate` — primary bash script (Git Bash friendly).
- `run-hook.cmd` — polyglot Windows wrapper (Git Bash + cmd).
- `ledger-activate.js` — Node implementation (primary for Grok/pwsh and pure-Node hosts).

## Setup (Windows / pwsh)
- Grok (and node-based hosts): the JS + hooks/hooks.json path works without Git Bash.
- Claude Code: prefer Git Bash or use `.\scripts\with-git-bash.cmd "command"`.
- Fallbacks are fail-open.

## Environment variables (plugin hooks)
- `GROK_PLUGIN_ROOT` (and `CLAUDE_PLUGIN_ROOT` alias) point at the installed plugin dir.

## Customization
See host hook tools (hookify, etc.).

See AGENTS.md and README.

