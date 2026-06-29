import { describe, it, expect, beforeAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';
import { TOOL_NAMES } from '../src/tools.js';
import { RESOURCE_URIS, TOOL_USE_WHEN } from '../src/resources.js';
import { PROMPT_NAMES } from '../src/prompts.js';

/** Spin up the real server + a client over an in-memory transport pair. */
async function connect() {
  const server = createServer();
  const client = new Client({ name: 'test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

/** Call a tool and parse its structured JSON result. */
async function call(client: Client, name: string, args: Record<string, unknown>) {
  const res: any = await client.callTool({ name, arguments: args });
  const text = res.content?.[0]?.text ?? '{}';
  return { parsed: JSON.parse(text), isError: !!res.isError };
}

const cashDebit = (amount: string) => ({
  accountCode: '1000',
  accountName: 'Cash',
  accountType: 'Asset' as const,
  amount,
  currency: 'USD',
  side: 'debit' as const,
});
const equityCredit = (amount: string) => ({
  accountCode: '3000',
  accountName: 'Owner Equity',
  accountType: 'Equity' as const,
  amount,
  currency: 'USD',
  side: 'credit' as const,
});

const balancedEntry = {
  id: 'cap-001',
  effectiveDate: '2026-06-21',
  description: 'Initial capital',
  lines: [cashDebit('10000.00'), equityCredit('10000.00')],
};

describe('ledger MCP server', () => {
  let client: Client;
  beforeAll(async () => {
    client = await connect();
  });

  it('exposes all expected tools', async () => {
    const list = await client.listTools();
    const names = list.tools.map((t) => t.name).sort();
    expect(names).toEqual([...TOOL_NAMES].sort());
  });

  it('money_compute does exact decimal arithmetic (no float drift)', async () => {
    const { parsed } = await call(client, 'money_compute', {
      op: 'add',
      a: { amount: '0.1', currency: 'USD' },
      b: { amount: '0.2', currency: 'USD' },
    });
    expect(parsed.ok).toBe(true);
    expect(parsed.result).toBe('0.30 USD'); // not 0.30000000000000004
  });

  it('money_compute allocate splits exactly with remainder to last', async () => {
    const { parsed } = await call(client, 'money_compute', {
      op: 'allocate',
      a: { amount: '10.00', currency: 'USD' },
      ratios: ['1', '1', '1'],
    });
    expect(parsed.parts).toEqual(['3.33 USD', '3.33 USD', '3.34 USD']);
  });

  it('entry_validate accepts a balanced entry', async () => {
    const { parsed } = await call(client, 'entry_validate', { entry: balancedEntry });
    expect(parsed.ok).toBe(true);
    expect(parsed.violations).toHaveLength(0);
  });

  it('entry_validate flags an unbalanced entry (the guardrail)', async () => {
    const bad = { ...balancedEntry, lines: [cashDebit('10000.00'), equityCredit('9000.00')] };
    const { parsed } = await call(client, 'entry_validate', { entry: bad });
    expect(parsed.ok).toBe(false);
    expect(parsed.violations.map((v: any) => v.type)).toContain('UNBALANCED');
  });

  it('entry_validate flags sub-scale precision (float-style amount)', async () => {
    const bad = {
      ...balancedEntry,
      lines: [cashDebit('100.005'), equityCredit('100.005')],
    };
    const { parsed } = await call(client, 'entry_validate', { entry: bad });
    expect(parsed.ok).toBe(false);
    expect(parsed.violations.map((v: any) => v.type)).toContain('SUB_SCALE');
  });

  it('ledger_post is fail-closed: an invalid entry is not posted', async () => {
    const bad = { ...balancedEntry, lines: [cashDebit('10000.00'), equityCredit('9000.00')] };
    const { parsed } = await call(client, 'ledger_post', { entry: bad });
    expect(parsed.posted).toBe(false);
    expect(parsed.violations.length).toBeGreaterThan(0);
  });

  it('ledger_post applies a valid entry and returns a ledger + audit hash', async () => {
    const { parsed } = await call(client, 'ledger_post', { entry: balancedEntry });
    expect(parsed.posted).toBe(true);
    expect(parsed.auditHash).toMatch(/^[0-9a-f]{64}$/);
    expect(parsed.ledger.entries).toHaveLength(1);

    // Round-trip the returned ledger through balance + equation tools.
    const bal = await call(client, 'ledger_balance', {
      ledger: parsed.ledger,
      accountCode: '1000',
    });
    expect(bal.parsed.balance).toBe('10000.00 USD');

    const eq = await call(client, 'ledger_verify_equation', { ledger: parsed.ledger });
    expect(eq.parsed.balanced).toBe(true);
  });

  it('trace_run produces per-step checkpoints and a final hash', async () => {
    const { parsed } = await call(client, 'trace_run', { entries: [balancedEntry] });
    expect(parsed.ok).toBe(true);
    expect(parsed.checkpoints).toHaveLength(1);
    expect(parsed.finalHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('trace_run fails closed on an invalid step', async () => {
    const bad = { ...balancedEntry, id: 'bad', lines: [cashDebit('1.00'), equityCredit('2.00')] };
    const { parsed, isError } = await call(client, 'trace_run', { entries: [bad] });
    expect(isError).toBe(true);
    expect(parsed.ok).toBe(false);
  });

  it('cite_lookup returns grounded citations', async () => {
    const { parsed } = await call(client, 'cite_lookup', { query: 'revenue' });
    expect(parsed.ok).toBe(true);
    expect(Array.isArray(parsed.citations)).toBe(true);
  });

  it('artifact_make rejects a kernel plan without core primitives', async () => {
    const { parsed, isError } = await call(client, 'artifact_make', {
      scope: 'x',
      assumptions: ['a'],
      proof: 'p',
      reproducibility: 'r',
      kernelPlan: 'just vibes',
    });
    expect(isError).toBe(true);
    expect(parsed.ok).toBe(false);
  });
});

describe('ledger MCP resources', () => {
  let client: Client;
  beforeAll(async () => {
    client = await connect();
  });

  it('exposes the expected resources', async () => {
    const list = await client.listResources();
    const uris = list.resources.map((r) => r.uri).sort();
    expect(uris).toEqual([...RESOURCE_URIS].sort());
  });

  it('serves the canon rules as markdown', async () => {
    const res = await client.readResource({ uri: 'ledger://canon/rules' });
    expect(res.contents[0].mimeType).toBe('text/markdown');
    expect(String(res.contents[0].text)).toContain('non-negotiable');
  });

  it('serves a tool catalog that covers every tool', async () => {
    const res = await client.readResource({ uri: 'ledger://tools/catalog' });
    const catalog = JSON.parse(String(res.contents[0].text));
    expect(catalog.count).toBe(TOOL_NAMES.length);
    const names = catalog.tools.map((t: any) => t.name).sort();
    expect(names).toEqual([...TOOL_NAMES].sort());
  });

  it('keeps the use-when map in lockstep with the tool surface (drift guard)', () => {
    expect(Object.keys(TOOL_USE_WHEN).sort()).toEqual([...TOOL_NAMES].sort());
  });
});

describe('ledger MCP prompts', () => {
  let client: Client;
  beforeAll(async () => {
    client = await connect();
  });

  it('exposes the expected prompts', async () => {
    const list = await client.listPrompts();
    const names = list.prompts.map((p) => p.name).sort();
    expect(names).toEqual([...PROMPT_NAMES].sort());
  });

  it('post_entry expands the intent into validate-then-post guidance', async () => {
    const res = await client.getPrompt({
      name: 'post_entry',
      arguments: { intent: 'Receive $5,000 capital from the owner' },
    });
    const text = res.messages.map((m: any) => m.content.text).join('\n');
    expect(text).toContain('Receive $5,000 capital from the owner');
    expect(text).toContain('entry_validate');
    expect(text).toContain('ledger_post');
  });
});
