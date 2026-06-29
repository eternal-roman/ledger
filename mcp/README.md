# @eternal-roman/ledger-mcp

An [MCP](https://modelcontextprotocol.io) server that exposes the
[`@eternal-roman/ledger`](https://github.com/eternal-roman/ledger) kernel
as tools an agent can invoke.

The server provides exact decimal arithmetic and kernel-enforced double-entry
validation so agents can call `money_compute`, `entry_validate`, `ledger_post`
and related operations instead of performing financial calculations in tokens.
Invalid entries are rejected and not posted.

## Install / run

```bash
npx -y @eternal-roman/ledger-mcp
```

It speaks MCP over stdio.

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "ledger": {
      "command": "npx",
      "args": ["-y", "@eternal-roman/ledger-mcp"]
    }
  }
}
```

### Cursor / Windsurf

Same shape under their MCP config (`command: npx`, `args: ["-y", "@eternal-roman/ledger-mcp"]`).

## Tools

| Tool | What it does |
|------|--------------|
| `money_compute` | Exact decimal arithmetic (add/sub/mul/div/allocate/convert/compare). Use instead of computing in tokens. |
| `entry_validate` | Kernel invariant check on a journal entry → `{ ok, violations[] }`. The guardrail. |
| `ledger_post` | Validate **then** apply an entry; fail-closed (invalid entries are not posted). Returns ledger JSON + audit hash. |
| `ledger_balance` | Net balance for an account (fails closed on multi-currency unless a currency is given). |
| `ledger_trial_balance` | Every account and its net balance. |
| `ledger_verify_equation` | Assets + Expenses = Liabilities + Equity + Income, per currency. |
| `ledger_audit_hash` | Tamper-evident SHA-256 chain over the ledger. |
| `ledger_verify_determinism` | Rebuild twice; prove byte-identical + equation holds. |
| `trace_run` | Step-by-step replay with per-step balances, equation, and hash prefix. |
| `cite_lookup` | Grounded IFRS/GAAP citations from the kernel knowledge graph. |
| `artifact_make` | Assemble a Canonical Financial Artifact (proof bundle). |
| `periods_create_lock` | Create a PeriodLock (hard close fact). |
| `periods_guarded_post` | Post an entry but reject if effectiveDate is on/after a period lock (anti-fraud). |
| `closing_generate_entries` | Generate balanced closing entries (Income/Expense → Retained Earnings) using kernel. |
| `fx_compute_translation` | Translate balances to reporting currency + compute exact CTA plug. |
| `depreciation_build_schedule` | Build exact straight-line (allocate) or declining depreciation schedule. |
| `cashflow_statement` | Exact direct-method cash flow statement derived from cash-account movements. |
| `reconcile_positions` | Reconcile ledger balances against an external snapshot (exchange/custodian/bank). |
| `portfolio_relief` | Lot relief (FIFO/LIFO/HIFO) with exact cost basis and short/long-term classification. |
| `settlement_build_entries` | Split a fill into trade-date and settlement-date (T+N) balanced entries. |

State is passed as JSON between calls (`ledger_post` returns a ledger you feed back
in), so every call is **stateless, reproducible, and replayable**.

## Resources

Read-only context a client can pull in so the agent knows the rules and the flow
before it acts:

| URI | What it is |
|-----|------------|
| `ledger://canon/rules` | The non-negotiable kernel invariants (markdown). |
| `ledger://canon/workflow` | The recommended end-to-end flow: compute → validate → post → prove → ground. |
| `ledger://tools/catalog` | Machine-readable list of every tool with one-line "use when" guidance (JSON). |

## Prompts

Guided templates that steer the agent to prove with the tools instead of computing in-token:

| Prompt | Arguments | What it does |
|--------|-----------|--------------|
| `post_entry` | `intent` | Draft → `entry_validate` → fix → `ledger_post` → prove. |
| `audit_ledger` | `ledger?` | Run trial balance, equation, audit hash, and determinism over a ledger. |
| `cite_treatment` | `concept` | `cite_lookup` first, then ground the treatment in canon. |

## Example flow

1. `entry_validate` a proposed entry → see violations, fix them.
2. `ledger_post` the corrected entry → get back `{ ledger, auditHash }`.
3. `ledger_verify_equation` / `ledger_balance` on the returned ledger → prove the books.

## Response Contract (Success + Errors)

All tool responses are delivered as `content[0].text` (JSON string) + `structuredContent`.

**Success and logical failures** (the common case):
```json
{ "ok": true, ...tool-specific fields... }     // success
{ "ok": false, "posted": false, "violations": [...] }  // e.g. entry_validate, ledger_post fail-closed
{ "ok": false, "violations": [...] }                   // entry_validate guardrail
```

- `ok: false` signals a kernel-level or semantic failure (unbalanced, sub-scale, period lock, oversell, etc.).
- These are returned without `isError` (the tool executed successfully and reported the failure).
- Always inspect `parsed.ok`.

**Precondition / runtime / unexpected errors**:
```json
{ "ok": false, "error": "..." }
```
- Returned with top-level `isError: true` on the CallToolResult.
- Used for missing required args, unknown ops, internal throws, etc.

**Schema / invocation errors** (SDK level, before handler):
- `isError: true`
- `content[0].text` starts with `"MCP error -32602: Input validation error: ..."`
- This happens for type violations (e.g. number instead of required string for rates/amounts).
- The strict Zod schemas in input declarations are intentional: they prevent float literals and bad data at the MCP boundary.

**Client guidance**:
```js
const res = await client.callTool(...);
const text = res.content?.[0]?.text ?? '{}';
let parsed = {};
try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
const failed = res.isError || parsed.ok === false;
if (failed) { /* handle violation or error */ }
```

The contract ensures semantic money failures are always structured with `ok` and never silently succeed.

## License

MIT — see the [root repository](https://github.com/eternal-roman/ledger).

## Disclaimer

The MCP server and `@eternal-roman/ledger` kernel supply exact-decimal arithmetic tools and double-entry guardrails for agents. **Not financial, tax, legal, or accounting advice.** The caller (or integrating system) is responsible for regulatory compliance, correct inputs/assumptions, and application of outputs. MCP tests, smoke, and kernel verifications are due diligence; the MIT License provides the supporting warranty disclaimer (see root LICENSE). Deterministic by construction on valid inputs; fail-closed on violations.
