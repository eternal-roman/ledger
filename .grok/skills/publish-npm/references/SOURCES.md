# Live sources of truth

Re-fetch these pages when blocked, when `npm -v` or `mcp-publisher --help` changed, or before a first-of-kind publish. Prefer the fetched page over this skill's memory.

## npm (docs.npmjs.com)

| Topic | URL |
|---|---|
| Scoped public publish (`--access public`, 2FA or GAT, staged vs direct) | https://docs.npmjs.com/creating-and-publishing-scoped-public-packages |
| 2FA required for publish + settings; GAT bypass rules; Aug 2026 identity-action exception | https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification |
| Creating granular tokens (bypass 2FA is a **create-time** checkbox) | https://docs.npmjs.com/creating-and-viewing-access-tokens#creating-granular-access-tokens-on-the-website |
| About access tokens / identity actions still need interactive 2FA | https://docs.npmjs.com/about-access-tokens#account-identity-actions-require-an-interactive-2fa-challenge |
| Trusted publishing (OIDC). Package must **already exist** to attach a publisher. | https://docs.npmjs.com/trusted-publishers |
| Staged publishing (`npm stage *`). Package must **already exist**. Needs npm ≥ 11.15 / 12. | https://docs.npmjs.com/staged-publishing |
| `npm publish` CLI | https://docs.npmjs.com/cli/publish |
| Account 2FA settings (owner UI) | https://www.npmjs.com/settings/~/tfa |
| Token UI | https://www.npmjs.com/settings/~/tokens |
| Staged packages UI | https://www.npmjs.com/ |

Local npm source (installed CLI, version-specific):

- `otplease` TTY gate + web OTP: `<npm>/lib/utils/auth.js`
- URL redaction vs `{ redact: false }`: `<npm>/lib/utils/open-url.js`
- EOTP vs 401/403 mapping: `<npm>/node_modules/npm-registry-fetch/lib/check-response.js`

Find npm root: `path.join(path.dirname(process.execPath), 'node_modules', 'npm')`.

## MCP registry

| Topic | URL |
|---|---|
| Latest `mcp-publisher` binaries | https://github.com/modelcontextprotocol/registry/releases/latest |
| Package types + **`mcpName` MUST match `server.json` name** | https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx |
| GitHub Actions / OIDC publish | https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/github-actions.mdx |
| Live `server.json` schema (`description.maxLength` = 100) | https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json |
| Older schema still used by some manifests | https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json |
| Search published servers | https://registry.modelcontextprotocol.io/v0/servers?search=io.github.eternal-roman/ledger |
| Registry issues (validation changes) | https://github.com/modelcontextprotocol/registry/issues |

`mcp-publisher login github -token` is documented on the latest release README / `login github --help`. Re-run `--help` after downloading a new binary.

CDN lag after adding `mcpName` to a just-published tarball: wait 10–15 minutes and retry (registry#559).

## Ledger repo

- `/release` skill: `~/.grok/skills/release/SKILL.md` — git bump, CI, signed tag, GitHub Release. Invoke **before** this skill.
- `docs/RELEASING.md` — short pointer; this skill is the procedure.
- Version gate: `npm run check:versions` / `scripts/check-versions.ts`
- Kernel: `@eternal-roman/ledger`
- MCP: `@eternal-roman/ledger-mcp`, registry name `io.github.eternal-roman/ledger`
