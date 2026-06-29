/**
 * MCP resources for the Ledger server.
 *
 * Resources are read-only context a client can pull into a conversation so the
 * agent knows the rules of the kernel and how to drive the tools BEFORE it acts.
 * Content is embedded (not read from disk) so the published binary is fully
 * self-contained and deterministic.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VERSION } from '@eternal-roman/ledger';
import { TOOL_NAMES } from './tools.js';

/** The non-negotiable invariants the kernel enforces — the canon, in brief. */
export const CANON_RULES = `# Ledger kernel — non-negotiable rules

A financial answer is only acceptable when ALL of these hold. The kernel tools
enforce them mechanically; do not assert them from memory.

1. **Exact decimal money only.** Never use floats, \`parseFloat\`, or in-token
   arithmetic for any amount. Every value flows through \`money_compute\`.
2. **Double-entry balanced.** Debits equal credits per currency. Validate every
   entry with \`entry_validate\` before posting; post with \`ledger_post\`
   (fail-closed — an invalid entry is never applied).
3. **No sub-scale precision.** An amount may not be finer than its currency's
   minor unit (e.g. \`100.001 USD\` is rejected).
4. **No silent currency mixing.** One entry, one currency — use explicit FX
   legs or separate entries across currencies.
5. **The fundamental equation holds.** Assets + Expenses = Liabilities + Equity
   + Income, per currency (\`ledger_verify_equation\`).
6. **Assumptions, rates, and policy are explicit and traceable.** Ground
   treatments in canon with \`cite_lookup\`; seed and log scenario assumptions.
7. **Deterministic and reproducible.** State travels as JSON between calls; the
   audit-hash chain is tamper-evident (\`ledger_audit_hash\`,
   \`ledger_verify_determinism\`).

Failure does not ship: prove with the kernel instead of guessing.`;

/** The recommended end-to-end flow for using the tools. */
export const CANON_WORKFLOW = `# How to use the Ledger MCP tools

The tools are **stateless**: a ledger travels as JSON in and out of each call,
so every step is reproducible and replayable.

## Posting value
1. Compute any amounts with \`money_compute\` (add/sub/mul/div/allocate/convert).
   Never do the math yourself.
2. Draft the journal entry and run \`entry_validate\` → read \`violations[]\`,
   fix them.
3. \`ledger_post\` the corrected entry → you get back \`{ ledger, auditHash }\`.
   Feed that \`ledger\` into the next call.

## Proving the books
- \`ledger_trial_balance\` — every account and its net balance.
- \`ledger_verify_equation\` — the accounting equation, per currency.
- \`ledger_balance\` — one account (pass \`currency\` for multi-currency).
- \`ledger_audit_hash\` / \`ledger_verify_determinism\` — tamper-evidence and
  byte-identical reproducibility.
- \`trace_run\` — replay a sequence with per-step checkpoints.

## Grounding and proof bundles
- \`cite_lookup\` — pull IFRS/GAAP citations from the knowledge graph.
- \`artifact_make\` — assemble a Canonical Financial Artifact (scope,
  assumptions, citations, kernel plan, proof, reproducibility).

## Operational
Period locks (\`periods_create_lock\`, \`periods_guarded_post\`), closing
(\`closing_generate_entries\`), FX translation + CTA (\`fx_compute_translation\`),
depreciation (\`depreciation_build_schedule\`), cash flow
(\`cashflow_statement\`), reconciliation (\`reconcile_positions\`), lot relief
(\`portfolio_relief\`), and settlement (\`settlement_build_entries\`).`;

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
  artifact_make: 'Assemble a Canonical Financial Artifact (proof bundle) for a financial answer.',
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
