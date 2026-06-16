import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateModuleAt } from './validateCommand.js';

const here = dirname(fileURLToPath(import.meta.url));
// packages/cli/src -> repo root -> modules/*
const repoRoot = join(here, '..', '..', '..');
const coreDir = join(repoRoot, 'modules', 'core');
const sampleDir = join(repoRoot, 'modules', 'sample-expansion');

describe('validateModuleAt', () => {
  it('passes for the real core module (schema + smoke test)', async () => {
    const report = await validateModuleAt(coreDir, { lives: 20, maxYears: 200 });
    expect(report.ok).toBe(true);
    expect(report.lines.some((l) => l.includes('Schema valid'))).toBe(true);
    expect(report.lines.some((l) => l.includes('Smoke test passed'))).toBe(true);
    expect(report.smoke?.problems).toEqual([]);
  });

  it('validates an expansion composed with the core module via --with', async () => {
    // Standalone the expansion never terminates (no vitality stat); with core
    // it does, so the smoke test passes.
    const standalone = await validateModuleAt(sampleDir, { lives: 3, maxYears: 20 });
    expect(standalone.ok).toBe(false);

    const composed = await validateModuleAt(sampleDir, {
      lives: 10,
      maxYears: 200,
      withModules: [coreDir],
    });
    expect(composed.ok).toBe(true);
  });

  it('fails clearly when a --with module cannot load', async () => {
    const report = await validateModuleAt(coreDir, {
      lives: 2,
      withModules: [join(tmpdir(), 'no-such-base-module')],
    });
    expect(report.ok).toBe(false);
    expect(report.lines.some((l) => l.includes('--with'))).toBe(true);
  });

  it('reports schema failure for a malformed module', async () => {
    const bad = await mkdtemp(join(tmpdir(), 'fateline-cli-'));
    await writeFile(
      join(bad, 'module.yaml'),
      ['id: BAD', 'name: X', 'version: 1.0.0', 'engineVersion: ">=0"', 'author: a'].join('\n'),
    );
    const report = await validateModuleAt(bad);
    expect(report.ok).toBe(false);
    expect(report.lines[0]).toContain('validation failed');
    await rm(bad, { recursive: true, force: true });
  });

  it('reports a missing module directory cleanly (no throw)', async () => {
    const report = await validateModuleAt(join(tmpdir(), 'definitely-not-here-12345'));
    expect(report.ok).toBe(false);
    expect(report.lines.join('\n')).toContain('validation failed');
  });

  it('flags a non-terminating module via the smoke test', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fateline-cli-nt-'));
    await writeFile(
      join(dir, 'module.yaml'),
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
    const report = await validateModuleAt(dir, { lives: 15, maxYears: 10 });
    expect(report.ok).toBe(false);
    expect(report.lines.some((l) => l.includes('Smoke test found'))).toBe(true);
    expect(report.lines.some((l) => l.includes('and') && l.includes('more'))).toBe(true);
    await rm(dir, { recursive: true, force: true });
  });
});
