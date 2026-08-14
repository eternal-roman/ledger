/** Embedded MCP resources (not read from disk). */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VERSION } from '@eternal-roman/ledger';
import { TOOL_NAMES } from './tools.js';

/** The non-negotiable invariants the kernel enforces — the canon, in brief. */
export const CANON_RULES = `# Ledger kernel — non-negotiable rules

The tools enforce these. Do not assert them from memory.

1. **Exact decimal.** No floats, \`parseFloat\`, or in-token arithmetic. Use \`money_compute\`.
2. **Balanced.** Debits = credits per currency. \`entry_validate\` then \`ledger_post\` (fail-closed).
3. **Scale.** Nothing finer than the currency's minor unit (\`100.001 USD\` is rejected).
4. **No silent FX.** One entry, one currency.
5. **Equation.** Assets + Expenses = Liabilities + Equity + Income (\`ledger_verify_equation\`).
6. **Traceable.** Cite treatments (\`cite_lookup\`). Log rates and seeds.
7. **Reproducible.** Ledger JSON in and out. \`ledger_audit_hash\` / \`ledger_verify_determinism\`.

Failure does not ship.`;

/** The recommended end-to-end flow for using the tools. */
export const CANON_WORKFLOW = `# How to use the Ledger MCP tools

Stateless: ledger JSON in, ledger JSON out.

## Post
1. \`money_compute\` — never do the math yourself.
2. \`entry_validate\` — fix \`violations[]\`.
3. \`ledger_post\` — keep the returned \`ledger\` + \`auditHash\`.

## Prove
- \`ledger_trial_balance\` / \`ledger_balance\` / \`ledger_verify_equation\`
- \`ledger_audit_hash\` / \`ledger_verify_determinism\` / \`trace_run\`

## Ground
- \`cite_lookup\` — IFRS/GAAP.
- \`artifact_make\` — every field required; \`auditHash\` must be session-issued or recomputable from a supplied ledger.

## Also
\`periods_create_lock\`, \`periods_guarded_post\`, \`closing_generate_entries\`, \`fx_compute_translation\`, \`depreciation_build_schedule\`, \`cashflow_statement\`, \`reconcile_positions\`, \`portfolio_relief\`, \`settlement_build_entries\`.`;

/**
 * One-line "use when" guidance per tool. Kept in lockstep with TOOL_NAMES by
 * tools.test.ts so the catalog can never silently drift from the real surface.
 */
export const TOOL_USE_WHEN: Record<(typeof TOOL_NAMES)[number], string> = {
  money_compute: 'Any monetary arithmetic — add/sub/mul/div/allocate/convert/compare. Use instead of computing in tokens.',
  entry_validate: 'Check a proposed journal entry against the kernel invariants before posting.',
  ledger_post: 'Validate then apply an entry to a ledger; fail-closed. Returns new ledger JSON + audit hash.',
  ledger_balance: 'Net balance for one account (pass currency for multi-currency accounts).',
  ledger_trial_balance: 'Every account and its current net balance.',
  ledger_verify_equation: 'Confirm Assets + Expenses = Liabilities + Equity + Income, per currency.',
  ledger_audit_hash: 'Tamper-evident SHA-256 hash chain over the whole ledger.',
  ledger_verify_determinism: 'Rebuild twice and prove byte-identical + equation holds.',
  trace_run: 'Replay a sequence of entries with per-step balances, equation, and hash prefix.',
  cite_lookup: 'Retrieve grounded IFRS/GAAP citations for a concept instead of asserting from memory.',
  artifact_make: 'Assemble a Canonical Financial Artifact (proof bundle) for a financial answer. Requires a session-issued (or ledger-recomputable) auditHash.',
  periods_create_lock: 'Create a PeriodLock (hard close) fact for anti-fraud guarded posting.',
  periods_guarded_post: 'Post an entry but reject it if effectiveDate is on/after a period lock.',
  closing_generate_entries: 'Generate balanced closing entries (Income/Expense → Retained Earnings).',
  fx_compute_translation: 'Translate balances to a reporting currency and compute the exact CTA plug.',
  depreciation_build_schedule: 'Build an exact straight-line or declining-balance depreciation schedule.',
  cashflow_statement: 'Derive an exact direct-method cash flow statement from the ledger.',
  reconcile_positions: 'Compare ledger balances against an external snapshot (exchange/custodian/bank).',
  portfolio_relief: 'Reconstruct lots and realized gains (FIFO/LIFO/HIFO) with short/long-term classification.',
  settlement_build_entries: 'Split a fill into trade-date and settlement-date (T+N) balanced entries.',
};

/** Machine-readable catalog payload (served as application/json). */
export function toolCatalog(): string {
  return JSON.stringify(
    {
      version: VERSION,
      count: TOOL_NAMES.length,
      tools: TOOL_NAMES.map((name) => ({ name, useWhen: TOOL_USE_WHEN[name] })),
    },
    null,
    2,
  );
}

export function registerResources(server: McpServer): void {
  server.registerResource(
    'canon-rules',
    'ledger://canon/rules',
    {
      title: 'Ledger kernel canon (rules)',
      description: 'The non-negotiable invariants every financial answer must satisfy.',
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: CANON_RULES }],
    }),
  );

  server.registerResource(
    'canon-workflow',
    'ledger://canon/workflow',
    {
      title: 'How to use the Ledger MCP tools',
      description: 'Recommended end-to-end flow: compute → validate → post → prove → ground.',
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: CANON_WORKFLOW }],
    }),
  );

  server.registerResource(
    'tool-catalog',
    'ledger://tools/catalog',
    {
      title: 'Ledger tool catalog',
      description: 'Machine-readable list of every tool with one-line "use when" guidance.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: toolCatalog() }],
    }),
  );
}

/** Resource URIs (for docs/tests). */
export const RESOURCE_URIS = [
  'ledger://canon/rules',
  'ledger://canon/workflow',
  'ledger://tools/catalog',
] as const;
