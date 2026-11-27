# Ledger development

@CONTRIBUTING.md

Kernel: [AGENTS.md](./AGENTS.md), [skills/ledger/SKILL.md](./skills/ledger/SKILL.md). Protocol: [docs/CORE-PROTOCOL.md](./docs/CORE-PROTOCOL.md).

1. Plan/TDD if those host skills exist.
2. Money only through the kernel (`Money.from` → `validateEntry` → `Ledger.apply`), ending in `artifact_make`.
3. Windows: use the Bash tool (Git Bash) for git/tag/sign/push. From PowerShell, wrap those in `.\scripts\with-git-bash.cmd "single-line cmd"` and truncate with `Select-Object -First/-Last` (no `head`/`tail`/`grep`). (`pwsh-shell-guard` is a Grok skill — not available in Claude Code.)
4. Inner loop: `npm test` (vitest), `npm run typecheck` (uses `tsconfig.typecheck.json`, not bare `tsc`), `npm run build` (tsup). Before shipping: `npm run verify:ledger`, then what CI runs: `npm run verify:full` + `npm run eval`.
5. Releasing: follow `docs/RELEASING.md`. Its `/release` (`~/.grok/skills/package-release/`) and `/publish-npm` (`.grok/skills/publish-npm/`) are Grok skills, not loaded here — read their `SKILL.md` as docs. Never bare `npm publish` from a non-TTY agent.

Never bypass invariants.
