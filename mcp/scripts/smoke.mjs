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

  // 3. MCP completeness: no missing tools/capabilities vs declared + README (up to date).
  // Parse README tool table to ensure surface matches docs (harden against drift).
  const fs = await import('node:fs');
  const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const readmeTools = (readme.match(/\| `([a-z_]+)` \|/g) || []).map(m => m.replace(/\| `|` \|/g, ''));
  // Filter to actual tools (exclude header etc); assert at least the TOOL_NAMES are documented.
  const documentedTools = readmeTools.filter(t => TOOL_NAMES.includes(t));
  assert(documentedTools.length === TOOL_NAMES.length, `MCP README tool table incomplete: documented ${documentedTools.length} vs ${TOOL_NAMES.length} expected`);
  assert(sortedEq(documentedTools, TOOL_NAMES), 'MCP tools in README do not match declared TOOL_NAMES');

  // 4. Exact arithmetic over the wire (no float drift).
  const add = await callJson(client, 'money_compute', {
    op: 'add', a: { amount: '0.1', currency: 'USD' }, b: { amount: '0.2', currency: 'USD' },
  });
  assert(add.result === '0.30 USD', `money_compute add => ${add.result}`);

  // 5. Fail-closed posting + a returned audit hash.
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

  // 6. Error shape contract (due diligence for robustness).
  // Schema errors (SDK level): isError + "MCP error" text.
  await expectError(client, 'fx_compute_translation', {
    ledger: posted.ledger,
    asOf: '2026-06-21',
    rates: { USD: { rate: 1.0, source: 'bad' } }, // number instead of string
    reportingCurrency: 'USD',
  }, 'schema');

  // Logical fail-closed (business): ok:false, no isError (structured violations).
  const unbalEntry = {
    id: 'smoke-bad', effectiveDate: '2026-06-28', description: 'unbal',
    lines: [
      { accountCode: 'CASH', accountName: 'Cash', accountType: 'Asset', amount: '1000.00', currency: 'USD', side: 'debit' },
      { accountCode: '3000', accountName: 'Equity', accountType: 'Equity', amount: '900.00', currency: 'USD', side: 'credit' },
    ],
  };
  const unbal = await callJson(client, 'ledger_post', { entry: unbalEntry });
  assert(unbal.ok === false && unbal.posted === false && Array.isArray(unbal.violations), 'logical fail-closed shape wrong');
  // Note: isError is typically undefined/false for these accounting guard results.

  // Precondition/runtime error: isError + ok:false + error.
  await expectError(client, 'money_compute', { op: 'add', a: { amount: '10', currency: 'USD' } }, 'error'); // missing b

  // 7. A resource and a prompt actually render.
  const rules = await client.readResource({ uri: 'ledger://canon/rules' });
  assert(String(rules.contents[0].text).includes('non-negotiable'), 'canon rules resource empty');
  const prompt = await client.getPrompt({ name: 'post_entry', arguments: { intent: 'test intent' } });
  const ptext = prompt.messages.map((m) => m.content.text).join('\n');
  assert(ptext.includes('entry_validate') && ptext.includes('test intent'), 'post_entry prompt did not render');

  await client.close();
  console.log(
    `MCP stdio smoke OK — ${tools.length} tools, ${resources.length} resources, ${prompts.length} prompts; ` +
      `README tools match: ${documentedTools.length}; 0.1+0.2=${add.result}; audit ${posted.auditHash.slice(0, 12)}…` +
      `; error shapes verified`,
  );
}

async function callJson(client, name, args) {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content?.[0]?.text ?? '{}';
  // Robust: schema errors produce "MCP error ..." text + isError; logical fails have ok:false
  if (res.isError) {
    let parsed = {};
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    return { isError: true, ...parsed, _raw: text };
  }
  return JSON.parse(text);
}

async function expectError(client, name, args, kind = 'any') {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content?.[0]?.text ?? '{}';
  const isErr = !!res.isError;
  let parsed = {};
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (kind === 'schema') {
    if (!isErr || !text.includes('MCP error')) throw new Error(`Expected schema error for ${name}`);
  } else if (kind === 'logical') {
    if (parsed.ok !== false) throw new Error(`Expected ok:false logical fail for ${name}`);
  } else if (kind === 'error') {
    if (!isErr || parsed.ok !== false) throw new Error(`Expected isError + ok:false for ${name}`);
  }
  return { isError: isErr, parsed, text };
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
