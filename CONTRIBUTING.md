# Contributing

This repository is the Ledger kernel. Monetary code follows `AGENTS.md` and `docs/CORE-PROTOCOL.md`.

## Invariants

- `Money.from`, `JournalEntry`, `validateEntry`, `Ledger.apply` for every value.
- No floats or native numbers for amounts.
- Every entry must pass `validateEntry`. The fundamental equation must hold.
- Tests must exercise the invariant you changed.
- Fewest lines. Cite canon where rates or policy apply.

## Verify before you open a PR

```bash
npm run verify:full
```

On Windows PowerShell, load `pwsh-shell-guard` before terminal work. Use `.\scripts\with-git-bash.cmd "..."` for git/signing. Truncate with `Select-Object`, not `head`/`tail`.

`main` requires a pull request and a green `ci-ok` check. Do not force-push `main`.

## Layout

- `src/core` — kernel
- `mcp/` — MCP adapter (no reimplemented math)
- `skills/`, `commands/`, `AGENTS.md` — agent surface
- `scripts/ledger-verify.ts` — mechanical scanner
- `reference-implementations/python/` — Python port of the kernel

Keep agent-facing files consistent with `docs/CORE-PROTOCOL.md`. Do not invent treatments the kernel does not implement.

## Versioning

`package.json` is source of truth. Run `npm run check:versions` after any bump. See `docs/RELEASING.md`.
