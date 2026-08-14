# Ledger development

Kernel: [AGENTS.md](./AGENTS.md), [skills/ledger/SKILL.md](./skills/ledger/SKILL.md). Contribute: [CONTRIBUTING.md](./CONTRIBUTING.md). Protocol: [docs/CORE-PROTOCOL.md](./docs/CORE-PROTOCOL.md).

1. Plan/TDD if those host skills exist.
2. Money only through the kernel + artifact.
3. Windows: `pwsh-shell-guard` before any terminal. `Select-Object` to truncate. `.\scripts\with-git-bash.cmd "…"` for git/signing.
4. `/ledger-verify` then ship.

Never bypass invariants.
