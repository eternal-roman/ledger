# Hooks for Ledger kernel activation

Activation hooks (best-effort) for AI hosts. The real rules live in AGENTS.md + skills/ledger/SKILL.md. Slash commands and skills work independently of hooks. Enforces Money.from, double-entry via validateEntry + Ledger.apply, canon, Zero-Skip. No unbalanced state.

## Files
- `hooks.json` — Grok-native (and compatible) SessionStart. Uses `GROK_PLUGIN_ROOT` + `CLAUDE_PLUGIN_ROOT`.
  Auto-discovered by Grok's own loader; deliberately left untouched by anything Claude-Code-specific
  (see "Why a separate claude-code-hooks.json" below).
- `claude-codex-hooks.json` — Claude/Codex compat SessionStart (points at run-hook.cmd). Note: as of
  this writing `.claude-plugin/plugin.json`'s explicit `"hooks"` field points at
  `claude-code-hooks.json` (below), not this file — its actual load path for Claude Code is unclear
  and it may be a dangling leftover; flagging rather than repurposing it without confirming intent.
- `claude-code-hooks.json` — **Claude Code only**, referenced explicitly via `.claude-plugin/plugin.json`'s
  `"hooks"` field (which *replaces* default `hooks/hooks.json` auto-discovery for Claude Code, per
  https://code.claude.com/docs/en/plugins-reference.md — so this file repeats SessionStart rather than
  relying on `hooks.json`, which Claude Code no longer reads once that field is set). Contains:
  - `SessionStart` — same activation banner as `hooks.json`, just Claude-Code-scoped.
  - `Stop` — `verify-proof-binding.cjs` (below). Kept in a dedicated, explicitly-referenced file
    instead of being added to the shared `hooks.json` because Grok also auto-discovers that file and
    its hook-event schema tolerance for an unrecognized key like `Stop` is unverified; isolating this
    avoids any risk of it breaking Grok's activation for every user of this plugin.
- `ledger-activate` — primary bash script (Git Bash friendly).
- `run-hook.cmd` — polyglot Windows wrapper (Git Bash + cmd).
- `ledger-activate.js` — Node implementation (primary for Grok/pwsh and pure-Node hosts).
- `verify-proof-binding.cjs` — Claude Code **Stop** hook (wired via `claude-code-hooks.json` above,
  plugin-shipped so it loads automatically for anyone who installs this as a Claude Code plugin —
  not `.claude/settings.json`, which is project-local and gitignored, so it never ships). Not an
  activation banner: it runs at the end of every turn and checks whether any currency amount or
  audit hash in the assistant's final message is traceable to a real ledger MCP tool result from
  that session (MCP tool names are matched in their namespaced transcript form,
  `mcp__<server>__<tool>`; proof is harvested only from kernel-computed value keys, and audit
  hashes only from the tools that mint them — never from `artifact_make`'s echo of caller input).
  See the file's header comment for the exact signature it looks for and its documented limits
  (it's a heuristic backstop, not a second kernel — the durable binding is `artifact_make`'s
  session-issued-hash check in `mcp/src/tools.ts`).

## Setup (Windows / pwsh)
- Grok (and node-based hosts): the JS + hooks/hooks.json path works without Git Bash.
- Claude Code: prefer Git Bash or use `.\scripts\with-git-bash.cmd "command"`.
- Fallbacks are fail-open.

## Fail-open vs fail-closed
The SessionStart activation banners above are deliberately **fail-open**: if the script can't run
on a given host, the session must still start. `verify-proof-binding.cjs` follows the same rule
for its own infrastructure (missing transcript, malformed input, internal errors all allow the
turn) — but it **blocks on a detected policy violation**: an unmatched monetary claim or audit
hash blocks the turn once so the model can correct it. To avoid infinite loops it will not block
the same turn twice (`stop_hook_active`); a mismatch that survives the retry ships with a visible
`systemMessage` warning rather than silently. That one-retry escape is why the hook is a backstop,
not the enforcement layer: the non-bypassable check is `artifact_make`'s session-hash binding.
`tests/hooks/activation.test.ts` asserts the activation banners actually still print (so a silent
regression is a CI failure, not something only a human notices), and
`tests/hooks/verify-proof-binding.test.ts` covers the Stop hook itself.

## Environment variables (plugin hooks)
- `GROK_PLUGIN_ROOT` (and `CLAUDE_PLUGIN_ROOT` alias) point at the installed plugin dir.

## Customization
See host hook tools (hookify, etc.).

See AGENTS.md and README.

