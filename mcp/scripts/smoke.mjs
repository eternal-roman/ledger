/**
 * End-user smoke test: spawn the BUILT dist/server.js over real stdio and prove
 * the whole surface answers — tools, resources, and prompts. This is the path a
 * client takes via `npx -y @eternal-roman/ledger-mcp`; the in-memory unit tests
 * do NOT exercise the compiled binary, so this guards against build/packaging
 * regressions (stale dist, broken bin, unresolved dependency).
 *
 * Exits 0 on success, non-zero with a clear reason on any failure.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { TOOL_NAMES } from '../dist/tools.js';
import { RESOURCE_URIS } from '../dist/resources.js';
import { PROMPT_NAMES } from '../dist/prompts.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(here, '..', 'dist', 'server.js');

function assert(cond, msg) {
  if (!cond) throw new Error(`SMOKE FAILED: ${msg}`);
}
const sortedEq = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

async function main() {
  const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath] });
  const client = new Client({ name: 'ledger-mcp-smoke', version: '0.0.0' });
  await client.connect(transport);

  // 1. Tool surface matches the declared list.
  const tools = (await client.listTools()).tools.map((t) => t.name);
  assert(sortedEq(tools, TOOL_NAMES), `tool list mismatch. got ${tools.length}: ${tools.join(',')}`);

  // 2. Resources + prompts are advertised.
  const resources = (await client.listResources()).resources.map((r) => r.uri);
  assert(sortedEq(resources, RESOURCE_URIS), `resource list mismatch: ${resources.join(',')}`);
  const prompts = (await client.listPrompts()).prompts.map((p) => p.name);
  assert(sortedEq(prompts, PROMPT_NAMES), `prompt list mismatch: ${prompts.join(',')}`);

  // 3. Exact arithmetic over the wire (no float drift).
  const add = await callJson(client, 'money_compute', {
    op: 'add', a: { amount: '0.1', currency: 'USD' }, b: { amount: '0.2', currency: 'USD' },
  });
  assert(add.result === '0.30 USD', `money_compute add => ${add.result}`);

  // 4. Fail-closed posting + a returned audit hash.
  const posted = await callJson(client, 'ledger_post', {
    entry: {
      id: 'smoke-1', effectiveDate: '2026-06-28', description: 'Smoke capital',
      lines: [
        { accountCode: 'CASH', accountName: 'Cash', accountType: 'Asset', amount: '1000.00', currency: 'USD', side: 'debit' },
        { accountCode: '3000', accountName: 'Equity', accountType: 'Equity', amount: '1000.00', currency: 'USD', side: 'credit' },
      ],
    },
  });
  assert(posted.posted === true, 'ledger_post did not post a valid entry');
  assert(/^[0-9a-f]{64}$/.test(posted.auditHash), `bad audit hash: ${posted.auditHash}`);

  const eq = await callJson(client, 'ledger_verify_equation', { ledger: posted.ledger });
  assert(eq.balanced === true, 'fundamental equation did not hold on posted ledger');

  // 5. A resource and a prompt actually render.
  const rules = await client.readResource({ uri: 'ledger://canon/rules' });
  assert(String(rules.contents[0].text).includes('non-negotiable'), 'canon rules resource empty');
  const prompt = await client.getPrompt({ name: 'post_entry', arguments: { intent: 'test intent' } });
  const ptext = prompt.messages.map((m) => m.content.text).join('\n');
  assert(ptext.includes('entry_validate') && ptext.includes('test intent'), 'post_entry prompt did not render');

  await client.close();
  console.log(
    `MCP stdio smoke OK — ${tools.length} tools, ${resources.length} resources, ${prompts.length} prompts; ` +
      `0.1+0.2=${add.result}; audit ${posted.auditHash.slice(0, 12)}…`,
  );
}

async function callJson(client, name, args) {
  const res = await client.callTool({ name, arguments: args });
  return JSON.parse(res.content?.[0]?.text ?? '{}');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
