import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Resolve the package's own name to source so tests (including the MCP workspace,
// whose tool handlers import the kernel by its published name) run against src/
// without requiring a prior build.
export default defineConfig({
  resolve: {
    alias: {
      '@eternal-roman/ledger': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts', 'mcp/tests/**/*.test.ts', 'eval/**/*.test.ts'],
  },
});
