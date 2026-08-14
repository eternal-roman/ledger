# Hooks

Best-effort activation. Rules live in `AGENTS.md`. Skills and slash commands work without hooks.

## Files

- `hooks.json` — Grok SessionStart (`GROK_PLUGIN_ROOT` / `CLAUDE_PLUGIN_ROOT`). No `Stop` key (Grok auto-loads this file).
- `claude-code-hooks.json` — what `.claude-plugin/plugin.json` points at. Repeats SessionStart (that field replaces `hooks.json`) and adds Stop → `verify-proof-binding.cjs`.
- `claude-codex-hooks.json` — SessionStart via `run-hook.cmd`. Not the plugin `hooks` target.
- `ledger-activate` / `ledger-activate.js` / `run-hook.cmd` — bash, node, Windows wrapper.
- `verify-proof-binding.cjs` — end-of-turn check: amounts and hashes in the final message must come from a real `tool_result`. Heuristic. Durable binding is `artifact_make` in MCP.

## Behavior

SessionStart is fail-open. The Stop hook is fail-open on its own errors, fail-closed on a detected mismatch (once per turn; then a warning). Tests: `tests/hooks/`.

Windows: node path works in pwsh. Bash-first hosts: Git Bash or `.\scripts\with-git-bash.cmd "…"`.
