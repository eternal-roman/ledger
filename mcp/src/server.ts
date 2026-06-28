#!/usr/bin/env node
/**
 * Ledger MCP server — the deterministic financial-correctness tools AI agents call.
 *
 * Exposes the @eternal-roman/ledger kernel over the Model Context Protocol so an
 * agent can validate, post, balance, trace, and prove monetary logic instead of
 * doing the math (and the invariant checks) in its own tokens. Stateless and
 * reproducible: ledger state travels as JSON between calls.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { VERSION } from '@eternal-roman/ledger';
import { registerTools } from './tools.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'ledger',
    version: VERSION,
  });
  registerTools(server);
  return server;
}

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio servers must not write to stdout (it is the protocol channel).
  console.error(`ledger-mcp v${VERSION} ready on stdio`);
}

// Only auto-start when run as a binary, not when imported by tests.
const isMain =
  !!process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  main().catch((err) => {
    console.error('ledger-mcp fatal:', err);
    process.exit(1);
  });
}
