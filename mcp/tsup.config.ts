import { defineConfig } from 'tsup';

// ESM-only CLI binary (package is "type": "module"). The kernel and the MCP SDK
// stay external. dts emitted for library-style imports (createServer/registerTools).
export default defineConfig({
  entry: {
    server: 'src/server.ts',
    tools: 'src/tools.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node18',
  outDir: 'dist',
});
