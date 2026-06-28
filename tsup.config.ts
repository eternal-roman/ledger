import { defineConfig } from 'tsup';
import { createRequire } from 'node:module';

const { version } = createRequire(import.meta.url)('./package.json') as { version: string };

// Dual ESM + CJS build so the package installs cleanly in both module systems.
// Two entry points preserve the public subpath export `@eternal-roman/ledger/core`.
// decimal.js stays external (declared in dependencies). `import.meta.url` in
// src/index.ts is shimmed automatically by tsup for the CJS output.
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'core/index': 'src/core/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'node18',
  outDir: 'dist',
  // Inject the version so the CJS bundle never references `import.meta`
  // (see resolveVersion in src/index.ts). Constant-folded + DCE'd by esbuild.
  define: {
    __LEDGER_VERSION__: JSON.stringify(version),
  },
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
});
