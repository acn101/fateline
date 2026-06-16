import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateModAt } from './validateCommand.js';

const here = dirname(fileURLToPath(import.meta.url));
// packages/cli/src -> repo root -> mods/*
const repoRoot = join(here, '..', '..', '..');
const coreDir = join(repoRoot, 'mods', 'core');
const sampleDir = join(repoRoot, 'mods', 'sample-expansion');

describe('validateModAt', () => {
  it('passes for the real core module (schema + smoke test)', async () => {
    const report = await validateModAt(coreDir, { lives: 20, maxYears: 200 });
    expect(report.ok).toBe(true);
    expect(report.lines.some((l) => l.includes('Schema valid'))).toBe(true);
    expect(report.lines.some((l) => l.includes('Smoke test passed'))).toBe(true);
    expect(report.smoke?.problems).toEqual([]);
  });

  it('validates an expansion composed with the core module via --with', async () => {
    // Standalone the expansion never terminates (no vitality stat); with core
    // it does, so the smoke test passes.
    const standalone = await validateModAt(sampleDir, { lives: 3, maxYears: 20 });
    expect(standalone.ok).toBe(false);

    const composed = await validateModAt(sampleDir, {
      lives: 10,
      maxYears: 200,
      withMods: [coreDir],
    });
    expect(composed.ok).toBe(true);
  });

  it('fails clearly when a --with module cannot load', async () => {
    const report = await validateModAt(coreDir, {
      lives: 2,
      withMods: [join(tmpdir(), 'no-such-base-module')],
    });
    expect(report.ok).toBe(false);
    expect(report.lines.some((l) => l.includes('--with'))).toBe(true);
  });

  it('reports schema failure for a malformed module', async () => {
    const bad = await mkdtemp(join(tmpdir(), 'fateline-cli-'));
    await writeFile(
      join(bad, 'mod.yaml'),
      ['id: BAD', 'name: X', 'version: 1.0.0', 'engineVersion: ">=0"', 'author: a'].join('\n'),
    );
    const report = await validateModAt(bad);
    expect(report.ok).toBe(false);
    expect(report.lines[0]).toContain('validation failed');
    await rm(bad, { recursive: true, force: true });
  });

  it('reports a missing module directory cleanly (no throw)', async () => {
    const report = await validateModAt(join(tmpdir(), 'definitely-not-here-12345'));
    expect(report.ok).toBe(false);
    expect(report.lines.join('\n')).toContain('validation failed');
  });

  it('flags a non-terminating module via the smoke test', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fateline-cli-nt-'));
    await writeFile(
      join(dir, 'mod.yaml'),
      ['id: com.t.nt', 'name: NT', 'version: 1.0.0', 'engineVersion: ">=0"', 'author: a'].join(
        '\n',
      ),
    );
    await mkdir(join(dir, 'content', 'definitions'), { recursive: true });
    await writeFile(
      join(dir, 'content', 'definitions', 'stats.yaml'),
      [
        'stats:',
        '  - id: mood',
        '    label: Mood',
        '    min: 0',
        '    max: 100',
        '    default: 50',
      ].join('\n'),
    );
    // 15 lives all fail to terminate -> exercises the >10 truncation branch.
    const report = await validateModAt(dir, { lives: 15, maxYears: 10 });
    expect(report.ok).toBe(false);
    expect(report.lines.some((l) => l.includes('Smoke test found'))).toBe(true);
    expect(report.lines.some((l) => l.includes('and') && l.includes('more'))).toBe(true);
    await rm(dir, { recursive: true, force: true });
  });
});
