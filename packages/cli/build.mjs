// Bundle the CLI into a single self-contained, Node-runnable file.
// Uses the esbuild JS API (the pnpm-installed `.bin/esbuild` shim is a native
// binary that some shells mis-invoke; the API avoids that entirely).
import { build } from 'esbuild';

await build({
  entryPoints: ['src/bin.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'bundle',
  outfile: 'dist/bin.js',
  banner: { js: '#!/usr/bin/env node' },
});
