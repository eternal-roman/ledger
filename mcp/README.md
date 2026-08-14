# @eternal-roman/ledger-mcp

MCP adapter for [`@eternal-roman/ledger`](https://github.com/eternal-roman/ledger). The kernel does the math. This process exposes it over stdio.

Agents must not compute money in tokens. Call these tools instead.

## Run

```bash
npx -y @eternal-roman/ledger-mcp
```

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

Same shape in Cursor, Windsurf, and other stdio MCP hosts.

On start, read `ledger://canon/rules`, then `ledger://canon/workflow`. Catalog: `ledger://tools/catalog`.

## Tools

| Tool | Use when |
|---|---|
| `money_compute` | Any arithmetic (add/sub/mul/div/allocate/convert/compare) |
| `entry_validate` | Before posting |
| `ledger_post` | Validate then apply; fail-closed |
| `ledger_balance` | One account (pass `currency` if mixed) |
| `ledger_trial_balance` | Every account |
| `ledger_verify_equation` | Assets + Expenses = Liabilities + Equity + Income |
| `ledger_audit_hash` | Tamper-evident digest (`ledger-audit-v2`) |
| `ledger_verify_determinism` | Rebuild twice; byte-identical |
| `trace_run` | Replay with per-step checkpoints |
| `cite_lookup` | IFRS/GAAP from the graph |
| `artifact_make` | Proof bundle; hash must be session-issued or recomputable |
| `periods_create_lock` | Create a hard-close lock |
| `periods_guarded_post` | Post, rejected if the period is locked |
| `closing_generate_entries` | Income/Expense → RE |
| `fx_compute_translation` | Reporting currency + CTA |
| `depreciation_build_schedule` | Straight-line or declining |
| `cashflow_statement` | Direct method from cash accounts |
| `reconcile_positions` | Ledger vs external snapshot |
| `portfolio_relief` | FIFO/LIFO/HIFO lots |
| `settlement_build_entries` | Trade date vs T+N |

Stateless: ledger JSON in, ledger JSON out. Prompts: `post_entry`, `audit_ledger`, `cite_treatment`.

## Not advice

Deterministic tools only. You own inputs, jurisdiction, and compliance. MIT LICENSE.
