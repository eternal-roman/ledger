/**
 * MCP prompts for the Ledger server.
 *
 * Prompts are user-initiated templates that expand into guidance messages,
 * steering the agent to PROVE with the kernel tools instead of computing money
 * in-token. Each returns a single user message the client can drop into context.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type GetPromptResult = {
  description?: string;
  messages: { role: 'user' | 'assistant'; content: { type: 'text'; text: string } }[];
};

function userMessage(text: string): GetPromptResult {
  return { messages: [{ role: 'user', content: { type: 'text', text } }] };
}

export function registerPrompts(server: McpServer): void {
  // Post a journal entry the right way: validate-then-post, never compute in-token.
  server.registerPrompt(
    'post_entry',
    {
      title: 'Post a journal entry (validate-first)',
      description: 'Guide the agent to draft, validate, and post a balanced double-entry transaction using the kernel.',
      argsSchema: {
        intent: z.string().describe('Plain-language description of the transaction to record'),
      },
    },
    ({ intent }) =>
      userMessage(
        `Record this transaction in the ledger using the Ledger MCP tools — do NOT do any money math in your own tokens:\n\n` +
          `> ${intent}\n\n` +
          `Steps:\n` +
          `1. Compute every amount with \`money_compute\` (add/sub/mul/div/allocate/convert). Pass amounts as exact decimal strings, never float literals.\n` +
          `2. Draft the journal entry (>= 2 lines, balanced per currency, positive line amounts, date as YYYY-MM-DD).\n` +
          `3. Call \`entry_validate\`. If \`ok\` is false, read \`violations[]\`, fix them, and re-validate.\n` +
          `4. Call \`ledger_post\` with the entry (and the prior \`ledger\` JSON if continuing). Confirm \`posted: true\` and capture \`auditHash\`.\n` +
          `5. Prove it: \`ledger_verify_equation\` and \`ledger_balance\` on the returned ledger.\n` +
          `Report the audit hash and the resulting balances.`,
      ),
  );

  // Audit / prove an existing ledger end to end.
  server.registerPrompt(
    'audit_ledger',
    {
      title: 'Audit a ledger',
      description: 'Guide the agent to prove an existing serialized ledger: trial balance, equation, audit hash, determinism.',
      argsSchema: {
        ledger: z.string().optional().describe('Serialized ledger JSON (Ledger.toJSON shape) to audit'),
      },
    },
    ({ ledger }) =>
      userMessage(
        `Audit ${ledger ? 'the ledger below' : 'the current ledger'} using the Ledger MCP tools and report findings — do not eyeball balances:\n\n` +
          (ledger ? `\`\`\`json\n${ledger}\n\`\`\`\n\n` : '') +
          `Steps:\n` +
          `1. \`ledger_trial_balance\` — list every account and net balance.\n` +
          `2. \`ledger_verify_equation\` — confirm the accounting equation holds per currency.\n` +
          `3. \`ledger_audit_hash\` — record the tamper-evident hash.\n` +
          `4. \`ledger_verify_determinism\` — confirm a rebuild is byte-identical.\n` +
          `State clearly whether the books are balanced, the audit hash, and any account that looks anomalous.`,
      ),
  );

  // Ground a treatment in canon before asserting it.
  server.registerPrompt(
    'cite_treatment',
    {
      title: 'Ground a treatment in canon',
      description: 'Guide the agent to fetch IFRS/GAAP citations for a concept before asserting an accounting treatment.',
      argsSchema: {
        concept: z.string().describe('The accounting concept to ground, e.g. "revenue recognition", "lease", "cost basis"'),
      },
    },
    ({ concept }) =>
      userMessage(
        `Before asserting any accounting treatment for "${concept}", ground it in canon:\n\n` +
          `1. Call \`cite_lookup\` with query "${concept}".\n` +
          `2. Use the returned citations and nodes as the basis for the treatment; cite them explicitly.\n` +
          `3. If you then record entries, attach the citations to the journal entry and validate with \`entry_validate\` before \`ledger_post\`.\n` +
          `Do not assert a treatment from memory if \`cite_lookup\` returns a grounded answer.`,
      ),
  );
}

/** Prompt names (for docs/tests). */
export const PROMPT_NAMES = ['post_entry', 'audit_ledger', 'cite_treatment'] as const;
