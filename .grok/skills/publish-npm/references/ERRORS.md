# npm / MCP registry errors

Match the **code + message**, then do the action. Re-fetch `SOURCES.md` if the message is new.

## ENEEDAUTH / `npm whoami` fails

Cause: no session.

Action: login through the helper (not bare `npm login`):

```
node $env:USERPROFILE\.grok\skills\publish-npm\scripts\npm-otplease.cjs . login --auth-type=web --registry https://registry.npmjs.org
```

Open the printed `Login at:` URL if no tab appears. Confirm `npm whoami`.

## E403 — "Two-factor authentication or granular access token with bypass 2fa enabled is required"

Cause: registry refused the **write**. This is not EOTP. `npm whoami` can still succeed. Re-running the helper **without** `--otp` returns the same 403.

Action (stop at first success):

1. Ask for a current 6-digit authenticator code only (never an `npm_…` token). Retry:
   `node $env:USERPROFILE\.grok\skills\publish-npm\scripts\npm-otplease.cjs <dir> publish --access public --otp=<code>`
2. If still 403, helper login (section above), then helper publish again (session should become EOTP + `authUrl`).
3. GAT only if 1–2 fail: user creates `$env:TEMP\npm-publish.npmrc` **outside chat** and replies with the **path only**. Create-time **bypass 2FA** must be checked. `--userconfig` that path. Delete the file after. Token in the TUI → revoke; do not retry with that value.

## EOTP — URL shown as `https://www.npmjs.com/auth/cli/***`

Cause: non-TTY redaction.

Action: `npm-otplease.cjs`. If the user missed the tab, `Start-Process` the contents of `%TEMP%\npm-otplease-auth-url.txt`.

## EOTP — "one-time password from your authenticator" / helper prints "Enter OTP" and sits

Cause: EOTP body has no `authUrl`/`doneUrl`; classic TOTP. Kill the hung helper.

Action: retry with `--otp=<6-digit>`. Do not paste a token.

## E403 — "You cannot publish over the previously published versions: X.Y.Z"

Cause: X.Y.Z already exists on the write cluster. Unauthenticated GET 404 is **not** proof it is unpublished.

Action:

1. `npm access get status <pkg>`. If not `public`, set it via `npm-otplease.cjs`. Stay on X.Y.Z.
2. Poll `npm view <pkg>@X.Y.Z version --userconfig <empty-file>`.
3. If it appears: stop. Do not bump. Continue the Done checks.
4. **Never bump because of this error.** Bump only if *this session* ran `npm unpublish <pkg>@X.Y.Z` or the packument has `time.unpublished` for X.Y.Z. Then `/release` patch and never reuse X.Y.Z.

## `+ @scope/name@version` then GET 404

Cause: scoped default **private**, or replica lag.

Action:

```
npm access get status @scope/name
# if not public:
node ...\npm-otplease.cjs . access set status=public @scope/name
# then poll with empty userconfig
```

Do not announce success until empty-userconfig `npm view` matches.

## E403 — "You don't have permission to publish"

Cause: wrong npm user, or `@scope` is an org the user does not own.

Action: `npm whoami`. User-scoped `@eternal-roman/*` requires user `eternal-roman`.

## 422 — `expected length <= 100` at `body.description`

Cause: MCP `server.json` `description` over schema `maxLength` 100.

Action: shorten, run the SKILL.md preflight node one-liner, **bump** if that version is already on npm, publish the new version, then `mcp-publisher publish`.

## 400 — `NPM package '…' is missing required 'mcpName' field`

Cause: published `package.json` lacks `"mcpName"` equal to `server.json` `"name"`.

Action: add `mcpName`, bump, publish MCP package, wait for npm (CDN lag up to 10–15 min — registry#559), then `mcp-publisher publish`. Cannot patch the already-published tarball.

## mcp-publisher 401 / "Authentication failed"

Action: `$env:GH_TOKEN = (gh auth token)` then `mcp-publisher login github -token $env:GH_TOKEN`. Do not Write-Host the token. Confirm `login github --help` on the downloaded binary. Namespace `io.github.<github-user>/…` must match the token's user.

## `Unknown command: stage`

Cause: npm < 11.15.

Action: do not stage. Direct-publish with `npm-otplease.cjs`. Staging also cannot create the **first** version of a new name.

## Trusted publishing ENEEDAUTH / 404 on first version

Cause: OIDC publisher can only be attached on an **existing** package.

Action: first version is interactive (this skill). After it is public, add a trusted publisher on npmjs.com (`SOURCES.md`) for later CI.

## `bin[…] script name … was invalid and removed`

Cause: npm auto-correct during pack (missing shebang, bad path).

Action: `npm view <pkg> bin` after publish. If empty, fix shebang/`bin` path, bump, republish. A warning during pack is not proof the bin was dropped — check `npm view`.
