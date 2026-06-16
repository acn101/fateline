// Emit docs/mod-schema.json (JSON Schema) from the Zod module schema, so
// authors get editor autocomplete + inline validation (README §8). Bundled
// with esbuild so the `.js`-specifier TS source runs under plain Node.
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const outFile = join(repoRoot, 'docs', 'mod-schema.json');
const tmp = join(here, 'dist', '.gen-json-schema.mjs');

const entry = `
import { z } from 'zod';
import { writeFile, mkdir } from 'node:fs/promises';
import { modSchema } from ${JSON.stringify(join(here, 'src', 'module.ts'))};
const schema = z.toJSONSchema(modSchema, { target: 'draft-7' });
await mkdir(${JSON.stringify(join(repoRoot, 'docs'))}, { recursive: true });
await writeFile(${JSON.stringify(outFile)}, JSON.stringify(schema, null, 2) + '\\n');
console.log('wrote ' + ${JSON.stringify(outFile)});
`;

await mkdir(join(here, 'dist'), { recursive: true });
await build({
  stdin: { contents: entry, resolveDir: here, loader: 'js' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'bundle',
  outfile: tmp,
});
await import(tmp);
await rm(tmp);
