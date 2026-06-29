# Releasing & registries

> ⚠️ **Status: DEFERRED — not released yet.** Do **not** run these steps as part of
> the current work. We are intentionally holding the npm/registry publish for a
> dedicated release PR. Tracked in
> [#50](https://github.com/eternal-roman/ledger/issues/50). The files here are in
> place so that follow-up PR is a quick, low-risk execution.

**For the internal Git version bump + signed tag + GitHub Release:** use the `/release` skill (or equivalent host command). It enforces the full sequence (feature PRs first, bump via protected path if needed, pre/post gates, `check:versions`, local signed tag+artifact, verification, MCP PRs where applicable). See `~/.grok/skills/release/SKILL.md` (or project copy) and `.github/workflows/release-tag.yml`.

The repo is prepared for publication; these are the manual steps a maintainer with
the right credentials runs for *final npm publish*. Nothing here is automated in CI (publishing requires an
npm token and registry accounts). The steps below assume the Git-side release (tag + GH Release) has already completed via the skill.

## 1. Publish the kernel — `@eternal-roman/ledger`

```bash
npm run clean && npm run verify:full   # build (ESM+CJS) + typecheck + tests + determinism
npm publish --access public            # scoped package, public access
```

`prepublishOnly` already runs `clean` + `verify:full`. Confirm the version in
`package.json` is bumped and `CHANGELOG.md` has an entry.

Verify the published artifact resolves under both module systems:

```bash
cd $(mktemp -d) && npm init -y >/dev/null
npm install @eternal-roman/ledger
node -e "console.log(require('@eternal-roman/ledger').VERSION)"            # CJS
node --input-type=module -e "import * as L from '@eternal-roman/ledger'; console.log(L.VERSION)"  # ESM
```

## 2. Publish the MCP server — `@eternal-roman/ledger-mcp`

The kernel must be published first. The kernel dependency in `mcp/package.json` is
already a published semver range (`"@eternal-roman/ledger": "^0.16.4"`) — npm
workspaces satisfies it from the in-repo kernel during development (no `file:..`
link to swap), so it is publish-safe as-is. **No edit is needed before
publishing.** Just keep the range in step with the kernel version on each release.

```bash
npm run verify:mcp                     # builds kernel + MCP, runs the stdio smoke
cd mcp && npm publish --access public
```

Smoke-test the binary:

```bash
npx -y @eternal-roman/ledger-mcp   # should print "ledger-mcp vX.Y.Z ready on stdio"
```

## 3. List the MCP server in registries

- **Official MCP registry** — `mcp/server.json` is a ready manifest
  (`io.github.eternal-roman/ledger`). Submit per
  https://github.com/modelcontextprotocol/registry.
- **Smithery** — add the server from the GitHub repo; it reads `mcp/server.json`.
- **Client marketplaces** (Claude, Cursor, Windsurf) — the install snippet is the
  `npx -y @eternal-roman/ledger-mcp` stdio config in `mcp/README.md`.

## 4. Plugin marketplaces (agent persona/skills)

The plugin manifests (`plugin.json`, `.claude-plugin/`) and adapters
(`.cursor/`, `.windsurf/`, `.clinerules/`, `.kiro/`) already point at the scoped
package and lead with the engineering value. No code change needed to list them.

## Version alignment

Keep these in lockstep on every release: `package.json`, `package-lock.json`,
`plugin.json`, `.claude-plugin/plugin.json`, `mcp/package.json`, `mcp/server.json`,
`reference-implementations/python/pyproject.toml`, and
`reference-implementations/python/ledger/__init__.py`.
