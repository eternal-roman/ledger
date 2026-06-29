# Releasing & registries

Git + tag + GitHub Release: follow the `/release` skill (enforces feature PRs first, bump on dedicated branch/PR if protected, `check:versions`, signed tag+artifact, post-merge gates, MCP PRs). See `~/.grok/skills/release/SKILL.md` and `.github/workflows/release-tag.yml`.

npm publish remains manual (needs tokens). These steps assume Git-side release (via skill) is complete.

## 1. Publish the kernel

```bash
npm run clean && npm run verify:full
npm publish --access public
```

`prepublishOnly` runs the gates. Confirm `package.json` + CHANGELOG updated.

Verify dual modules post-publish:

```bash
cd $(mktemp -d) && npm init -y >/dev/null && npm install @eternal-roman/ledger
node -e "console.log(require('@eternal-roman/ledger').VERSION)"
node --input-type=module -e "import * as L from '@eternal-roman/ledger'; console.log(L.VERSION)"
```

## 2. Publish the MCP server

Kernel first. `mcp/package.json` uses semver range for kernel dep (workspaces ok in dev; no file: link). Keep range in sync on release.

```bash
npm run verify:mcp
cd mcp && npm publish --access public
```

Smoke: `npx -y @eternal-roman/ledger-mcp` (prints ready banner).

## 3. Registries & marketplaces

- MCP registry: submit `mcp/server.json` (io.github.eternal-roman/ledger).
- Smithery, client marketplaces: use the `npx -y @eternal-roman/ledger-mcp` snippet from mcp/README.md.
- Plugins: manifests/adapters already reference the package; no edits needed.

## Version alignment

Keep in lockstep: package.json (+lock), plugin*.json, mcp/{package,server}.json, python/pyproject + __init__.py.
