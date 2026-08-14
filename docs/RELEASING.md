# Releasing & registries

Git + tag + GitHub Release: follow the `/release` skill (enforces feature PRs first, bump on dedicated branch/PR if protected, `check:versions`, signed tag+artifact, post-merge gates, MCP PRs). See `~/.grok/skills/release/SKILL.md` and `.github/workflows/release-tag.yml`.

**Signed-tag race:** `.github/workflows/release-tag.yml` often creates an unsigned bot tag + GitHub Release as soon as the version bump lands on main. Replacing that tag with a local signed tag (delete remote tag, push signed) briefly removes the tag and flips the Release to **Draft**. Handle in one motion — `git push origin :refs/tags/vX.Y.Z && git push origin vX.Y.Z && gh release edit vX.Y.Z --draft=false` — and confirm `isDraft=false`. The workflow also re-publishes draft releases on its final step when a `v*` tag push re-runs it.

npm + MCP registry: follow **`/publish-npm`** (`~/.grok/skills/publish-npm/SKILL.md`, also `.grok/skills/publish-npm/` in this repo). Do not run bare `npm publish` from a non-TTY agent. First scoped publish is private until `npm access set status=public`. `+ name@version` is not proof.

Kernel first, then `@eternal-roman/ledger-mcp`. `mcp/package.json` must keep `"mcpName": "io.github.eternal-roman/ledger"` and a `server.json` description ≤ 100 characters. Smithery / hosts: `npx -y @eternal-roman/ledger-mcp`.

## Version alignment

Keep in lockstep: package.json (+lock), plugin*.json, mcp/{package,server}.json, python/pyproject + __init__.py.
