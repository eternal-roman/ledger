/**
 * Proposers produce the journal entries to be scored.
 *
 *   fixtureProposer : the recorded baseline proposals (deterministic, no network).
 *                     This is the default and what CI runs.
 *   liveProposer    : asks a Claude model to draft an entry per task, behind an
 *                     ANTHROPIC_API_KEY. Demonstrates the same harness on real
 *                     model output without adding a hard dependency or touching CI.
 */
import { tasks, baselineProposals, type Entry } from './dataset.js';

export function fixtureProposer(): Entry[] {
  return tasks.map((t) => baselineProposals[t.id]);
}

const DEFAULT_MODEL = process.env.LEDGER_EVAL_MODEL ?? 'claude-sonnet-4-6';

const SYSTEM = [
  'You are a bookkeeping assistant. For the given instruction, output ONLY a JSON',
  'object for a single double-entry journal entry with this exact shape:',
  '{ "id": string, "date": "YYYY-MM-DD", "description": string,',
  '  "lines": [ { "accountCode": string, "accountName": string,',
  '    "accountType": "Asset"|"Liability"|"Equity"|"Income"|"Expense",',
  '    "amount": string, "currency": string, "side": "debit"|"credit" } ] }',
  'Use decimal strings for amounts. No prose, no code fences.',
].join('\n');

/** Live proposer using the Anthropic SDK. Only invoked with --live and a key. */
export async function liveProposer(): Promise<Entry[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('liveProposer requires ANTHROPIC_API_KEY in the environment.');
  }
  let Anthropic: any;
  try {
    // @ts-ignore optional peer dependency, resolved only in --live mode
    Anthropic = (await import('@anthropic-ai/sdk')).default;
  } catch {
    throw new Error(
      'liveProposer requires the Anthropic SDK. Install it: npm i -D @anthropic-ai/sdk',
    );
  }
  const client = new Anthropic();
  const out: Entry[] = [];
  for (const t of tasks) {
    const msg = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Task ${t.id}: ${t.prompt}` }],
    });
    const text = (msg.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')
      .trim();
    out.push({ ...(JSON.parse(text) as Entry), id: t.id });
  }
  return out;
}
