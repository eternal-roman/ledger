# Ledger development

Kernel: [AGENTS.md](./AGENTS.md), [skills/ledger/SKILL.md](./skills/ledger/SKILL.md). Contribute: [CONTRIBUTING.md](./CONTRIBUTING.md). Protocol: [docs/CORE-PROTOCOL.md](./docs/CORE-PROTOCOL.md).

1. Plan/TDD if those host skills exist.
2. Money only through the kernel + artifact.
3. Windows: use the Bash tool (Git Bash) for git/tag/sign/push. From PowerShell, wrap those in `.\scripts\with-git-bash.cmd "single-line cmd"` and truncate with `Select-Object -First/-Last` (no `head`/`tail`/`grep`). (`pwsh-shell-guard` is a Grok skill — not available in Claude Code.)
4. Before shipping: `npm run verify:ledger`, then what CI runs: `npm run verify:full` + `npm run eval`.

Never bypass invariants.
