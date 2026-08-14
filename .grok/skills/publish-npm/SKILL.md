---
name: publish-npm
description: >
  This skill should be used when the user asks to "publish to npm",
  "npm publish", "/publish-npm", "/publish_npm", or "submit to the MCP
  registry"; or when the session hits EOTP, E403, ENEEDAUTH, 2FA,
  "bypass 2fa", "cannot publish over the previously published versions",
  redacted auth/cli/***, "+ package@version" that still 404s, a private
  scoped package, missing mcpName, server.json description too long,
  or an npm_ / granular access token in chat.
---

# /publish-npm

Git Release (`/release`) is not npm. This skill publishes packages and the MCP registry entry after git is done.

**REQUIRED BACKGROUND:** Windows sessions load `pwsh-shell-guard` before any terminal. Do not paste tokens into chat. Do not commit `.npmrc`.

When blocked or npm/MCP CLI versions change, **re-fetch** the URLs in `references/SOURCES.md` and follow the live page, not memory.

## Done means all of these

1. `npm view <pkg> version --userconfig <empty-file>` equals the intended version (no session).
2. `npm access get status <pkg>` is `public` for every scoped package meant to be public.
3. Clean-room install proves the artifact: CJS `require`, ESM `import`, and the MCP banner.
4. If this repo ships MCP: registry search returns `io.github.eternal-roman/ledger` at that version, status `active`.
5. Tracking issue closed only after 1–4.

`+ @scope/name@version` is **not** done. First scoped publish is private until `npm access set status=public`. Registry GET can 404 for minutes after a successful PUT.

## Preconditions

On `main` matching `origin/main`. `npm run check:versions` and `npm run verify:full` green. `npm whoami` is the intended owner. `npm profile get` shows `two-factor auth: auth-and-writes` (or equivalent). Scoped `package.json` has `"publishConfig": { "access": "public" }` **or** every publish uses `--access public`.

Ledger extras before any tarball leaves the machine:

- `mcp/package.json` has `"mcpName"` **exactly** equal to `mcp/server.json` `"name"` (today `io.github.eternal-roman/ledger`).
- `mcp/server.json` `"description"` length ≤ 100 (live schema: https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json ).
- `mcp/package.json` depends on the kernel by semver (`^X.Y.Z`), never `file:`.
- Kernel version on npm must exist **before** publishing MCP.

`npm run check:versions` now also fails if `mcpName` ≠ `server.json` name, if `description` is empty or > 100 chars, or if `server.json` top version and `packages[0].version` disagree. Do not trust `server.json` `$schema` for the length cap — registry uses the live schema in `references/SOURCES.md`.

Missing `mcpName` or a long description on an already-published version **cannot** be patched in place. Bump (`/release` patch), then publish the new version.

## Auth (non-TTY agent)

Forbidden as bare commands in this TUI: `npm publish`, `npm access set`, `npm login`. Route all three through `scripts/npm-otplease.cjs`. `npm whoami` is not authorization to publish.

`otplease` (`lib/utils/auth.js`) only continues on **EOTP / E401 + "one-time pass"** and only opens a browser when stdin+stdout are TTYs. Agent shells are not TTYs, so confirm URLs print as `auth/cli/***`. The helper fakes a TTY and opens the real URL. It does **not** turn a plain **E403 2FA** into a tab — that path needs `--otp=<6-digit>` or a helper `login` first (see `references/ERRORS.md`).

```pwsh
node "$env:USERPROFILE\.grok\skills\publish-npm\scripts\npm-otplease.cjs" <pkg-dir> publish --access public
node "$env:USERPROFILE\.grok\skills\publish-npm\scripts\npm-otplease.cjs" . access set status=public @scope/name
node "$env:USERPROFILE\.grok\skills\publish-npm\scripts\npm-otplease.cjs" . login --auth-type=web --registry https://registry.npmjs.org
```

Add `--ignore-scripts` only after `verify:full` already passed **this turn**. Helper default is `publish --access public` (scripts on).

Tell the user a **browser tab** will open; approve while signed in as the owner. Re-open `$env:TEMP\npm-otplease-auth-url.txt` if they miss it. If the helper prints "Enter OTP" and sits, kill it and retry with `--otp=<6-digit>`.

**First publish of a new name cannot use trusted publishing or `npm stage publish`.** Both require the package to already exist. After the first public version, configure trusted publishing for later CI (`references/SOURCES.md`).

Never put `npm_…` in chat. Never ask the user to paste a token. If a GAT is required: user writes `$env:TEMP\npm-publish.npmrc` **outside chat**, replies with the **path only**, publish with `--userconfig` that path, delete the file after. Token in the TUI → stop and revoke; do not retry with that value.

## Sequence (Ledger)

1. `/release` complete: bump on `main`, CI green, GitHub Release published (`isDraft=false`).
2. Preflight the MCP fields above. `npm view` the **previous** kernel if this is not the first version.
3. Publish kernel from repo root via `npm-otplease.cjs`.
4. `npm access get status @eternal-roman/ledger` — if not `public`, set it via the helper.
5. Empty-userconfig view must match:

```pwsh
$empty = Join-Path $env:TEMP ("npmrc-empty-" + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType File -Path $empty | Out-Null
npm view @eternal-roman/ledger version --userconfig $empty
```

If PUT said "cannot publish over … X.Y.Z" and this 404s: set public, then poll view. **Never bump** because of that pair. Load `references/ERRORS.md`.
6. Publish `mcp/` the same way. Set public. Wait for `npm view @eternal-roman/ledger-mcp version`.
7. Confirm `npm view @eternal-roman/ledger-mcp mcpName`.
8. Clean-room (new empty dir, not this repo):

```pwsh
$d = Join-Path $env:TEMP ("npm-smoke-" + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $d | Out-Null
Set-Location $d
npm install @eternal-roman/ledger@<ver> --no-fund --no-audit
node -e "console.log('CJS', require('@eternal-roman/ledger').VERSION)"
node --input-type=module -e "import * as L from '@eternal-roman/ledger'; console.log('ESM', L.VERSION)"
npm install @eternal-roman/ledger-mcp@<ver> --no-fund --no-audit
```

MCP banner: start `node node_modules/@eternal-roman/ledger-mcp/dist/server.js`, expect `ledger-mcp v<ver> ready on stdio`, then stop the process. `npx -y` is optional extra; empty capture from `Start-Job`/`Start-Process` is not a failure if the direct `node` banner is correct.

9. MCP registry (from `mcp/`):

```pwsh
# download current mcp-publisher from the latest GitHub release (SOURCES.md)
$env:GH_TOKEN = (gh auth token)   # do not Write-Host this
mcp-publisher login github -token $env:GH_TOKEN
mcp-publisher publish
```

If `npm-otplease.cjs` no longer intercepts after an npm major bump, stop. Re-read `<npm>/lib/utils/auth.js` and update the helper. Do not invent a third publish path.

`io.github.*` namespace is the GitHub user. Re-login if the binary is new.

10. Prove registry: fetch `https://registry.modelcontextprotocol.io/v0/servers?search=io.github.eternal-roman/ledger` and confirm `version` + `status: active`.

## Errors

Load `references/ERRORS.md` on any npm/registry failure. Do not invent a new workaround.

## Red flags — stop

- Declaring success from `+ name@version` without `npm view`
- Bare `npm publish` in this TUI
- Pasting `npm_…` tokens into the conversation
- Bumping the version because GET 404'd after PUT said the version exists
- Publishing MCP before the kernel version is visible
- Skipping `mcpName` / description length and hoping to "fix the same version"
- Stopping after the GitHub Release

| Excuse | Reality |
|---|---|
| "whoami works, publish will work" | 2FA `auth-and-writes` still requires OTP/web confirm |
| "I opened a PowerShell window" | User often never sees it; use `npm-otplease.cjs` |
| "URL is \*\*\*" | Non-TTY redaction; helper required |
| "404 means we didn't publish" | Or private, or replica lag, or burned unpublished version |
| "GAT bypasses everything" | Bypass is a create-time flag; Aug 2026 still challenges identity actions |

## Files

- `scripts/npm-otplease.cjs` — only supported way to `publish` / `access set` from this agent
- `references/SOURCES.md` — live docs to re-fetch when stuck
- `references/ERRORS.md` — error → cause → next command
