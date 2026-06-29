#!/usr/bin/env node
// ledger-activate — Node activation hook for Ledger kernel
// 
// Used by Grok via hooks/hooks.json (GROK_PLUGIN_ROOT) and for compatibility.
// Bash primary (ledger-activate + run-hook.cmd) retained for Claude Code + Git Bash users.
//
// Prints activation banner only. The real rules live in AGENTS.md + skills/ledger/SKILL.md.
// Hooks are best-effort; slash commands and skills work independently.

console.log('Ledger kernel active.');
console.log('Rules: Zero-Skip ladder + Canonical Financial Artifact + no floats + double-entry proof.');
console.log('Use /ledger-verify, /ledger-audit, /ledger-review (or equivalents) before shipping. Enforce exact balanced results.');
process.exit(0);