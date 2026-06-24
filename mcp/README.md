# @eternal-roman/ledger-mcp

**The deterministic financial-correctness tools AI agents call.**

An [MCP](https://modelcontextprotocol.io) server that exposes the
[`@eternal-roman/ledger`](https://github.com/eternal-roman/ledger) kernel —
exact decimal money, kernel-enforced double-entry, immutable audit-hashed
ledgers — as tools an agent can invoke.

LLMs do pattern-matching, not arithmetic: they hallucinate numbers, miscategorize,
and are confidently wrong. The fix the industry converges on is to **offload the
math and the invariants to a deterministic tool**. This server is that tool for
money. The agent decides *what*; the kernel computes *how*, and **provably cannot
emit unbalanced or float-based entries** — an invalid entry is rejected, not posted.

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

State is passed as JSON between calls (`ledger_post` returns a ledger you feed back
in), so every call is **stateless, reproducible, and replayable**.

## Example flow

1. `entry_validate` a proposed entry → see violations, fix them.
2. `ledger_post` the corrected entry → get back `{ ledger, auditHash }`.
3. `ledger_verify_equation` / `ledger_balance` on the returned ledger → prove the books.

## License

MIT — see the [root repository](https://github.com/eternal-roman/ledger).
