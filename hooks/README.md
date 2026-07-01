# Hooks for Ledger kernel activation

Activation hooks (best-effort) for AI hosts. The real rules live in AGENTS.md + skills/ledger/SKILL.md. Slash commands and skills work independently of hooks. Enforces Money.from, double-entry via validateEntry + Ledger.apply, canon, Zero-Skip. No unbalanced state.

## Files
- `hooks.json` — Grok-native (and compatible) SessionStart. Uses `GROK_PLUGIN_ROOT` + `CLAUDE_PLUGIN_ROOT`.
- `claude-codex-hooks.json` — Claude/Codex compat SessionStart (points at run-hook.cmd).
- `ledger-activate` — primary bash script (Git Bash friendly).
- `run-hook.cmd` — polyglot Windows wrapper (Git Bash + cmd).
- `ledger-activate.js` — Node implementation (primary for Grok/pwsh and pure-Node hosts).
- `verify-proof-binding.cjs` — Claude Code **Stop** hook, wired via the `Stop` key in
  `hooks.json` (plugin-shipped, loaded automatically for anyone who installs this as a Claude Code
  plugin — `${CLAUDE_PLUGIN_ROOT}` resolves to the installed plugin dir; not `.claude/settings.json`,
  which is project-local and gitignored, so it never ships). Not an activation banner: it runs at
  the end of every turn and checks whether any currency amount or audit hash in the assistant's
  final message is traceable to a real ledger MCP tool result from that session. See the file's
  header comment for the exact signature it looks for and its documented limits (it's a heuristic
  backstop, not a second kernel).

## Setup (Windows / pwsh)
- Grok (and node-based hosts): the JS + hooks/hooks.json path works without Git Bash.
- Claude Code: prefer Git Bash or use `.\scripts\with-git-bash.cmd "command"`.
- Fallbacks are fail-open.

## Fail-open vs fail-closed
The SessionStart activation banners above are deliberately **fail-open**: if the script can't run
on a given host, the session must still start. `verify-proof-binding.cjs` follows the same rule
for its own infrastructure (missing transcript, malformed input, internal errors all allow the
turn) — but it is **fail-closed on a detected policy violation**: an unmatched monetary claim or
audit hash blocks the turn until it's corrected. `tests/hooks/activation.test.ts` asserts the
activation banners actually still print (so a silent regression is a CI failure, not something
only a human notices), and `tests/hooks/verify-proof-binding.test.ts` covers the Stop hook itself.

## Environment variables (plugin hooks)
- `GROK_PLUGIN_ROOT` (and `CLAUDE_PLUGIN_ROOT` alias) point at the installed plugin dir.

## Customization
See host hook tools (hookify, etc.).

See AGENTS.md and README.

