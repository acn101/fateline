// Generate a pre-validated, bundlable JSON of the core module from its YAML.
// React Native bundles can't read YAML from disk at runtime, so the app imports
// this generated artifact instead of calling loadModuleFromDir.
//
// Workspace packages expose TypeScript source as their entrypoints (ideal for
// the bundler and Vitest), so we esbuild-bundle this generator on the fly to
// run it under plain Node.
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { build } from 'esbuild';

const coreDir = dirname(fileURLToPath(import.meta.url));
const tmp = join(coreDir, 'generated', '.generate.mjs');

const entry = `
import { mkdir, writeFile } from 'node:fs/promises';
import { loadModuleFromDir } from '@fateline/module-io';
const result = await loadModuleFromDir(${JSON.stringify(coreDir)});
if (!result.ok) { console.error(JSON.stringify(result.errors, null, 2)); process.exit(1); }
await mkdir(${JSON.stringify(join(coreDir, 'generated'))}, { recursive: true });
await writeFile(${JSON.stringify(join(coreDir, 'generated', 'core.json'))}, JSON.stringify(result.value, null, 2) + '\\n');
console.log('generated core.json: ' + result.value.content.events.length + ' events, ' + result.value.content.stats.length + ' stats');
`;

await mkdir(join(coreDir, 'generated'), { recursive: true });
await build({
  stdin: { contents: entry, resolveDir: coreDir, loader: 'js' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'bundle',
  outfile: tmp,
});
await import(tmp);
await rm(tmp);
