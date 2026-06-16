import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadModFromDir, extractItems } from './loadFromDir.js';

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'fateline-io-'));
  await writeFile(
    join(dir, 'mod.yaml'),
    [
      'id: com.test.io',
      'name: IO Test',
      'version: 1.0.0',
      'engineVersion: ">=0.0.0"',
      'author: Tester',
    ].join('\n'),
  );

  // definitions/stats.yaml uses the wrapped `stats:` form (README §4.4).
  await mkdir(join(dir, 'content', 'definitions'), { recursive: true });
  await writeFile(
    join(dir, 'content', 'definitions', 'stats.yaml'),
    [
      'stats:',
      '  - id: health',
      '    label: Health',
      '    min: 0',
      '    max: 100',
      '    default: 100',
      '    exposeAs: health',
    ].join('\n'),
  );

  // events split across two files, one a bare array, one a single object.
  await mkdir(join(dir, 'content', 'events'), { recursive: true });
  await writeFile(
    join(dir, 'content', 'events', 'a.yaml'),
    [
      '- id: evt.one',
      '  title: One',
      '  conditions: []',
      '  choices:',
      '    - text: ok',
      '      outcomes:',
      '        - weight: 1',
      '          effects: []',
      '          resultText: done',
    ].join('\n'),
  );
  // b uses the .yml extension and a future/unknown folder is ignored.
  await mkdir(join(dir, 'content', 'careers'), { recursive: true });
  await writeFile(join(dir, 'content', 'careers', 'ignored.yaml'), 'id: should-be-ignored');
  await writeFile(
    join(dir, 'content', 'events', 'b.yml'),
    [
      'id: evt.two',
      'title: Two',
      'conditions: []',
      'choices:',
      '  - text: ok',
      '    outcomes:',
      '      - weight: 1',
      '        effects: []',
      '        resultText: done',
    ].join('\n'),
  );
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('loadModFromDir', () => {
  it('reads the §5.1 on-disk layout and validates it', async () => {
    const result = await loadModFromDir(dir);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.content.stats).toHaveLength(1);
      expect(result.value.content.stats[0]!.exposeAs).toBe('health');
      // both the array file and the single-object file merged in
      expect(result.value.content.events.map((e) => e.id).sort()).toEqual(['evt.one', 'evt.two']);
    }
  });

  it('surfaces validation errors from malformed content', async () => {
    const bad = await mkdtemp(join(tmpdir(), 'fateline-bad-'));
    await writeFile(
      join(bad, 'mod.yaml'),
      ['id: NOT_VALID', 'name: X', 'version: 1.0.0', 'engineVersion: ">=0"', 'author: a'].join(
        '\n',
      ),
    );
    const result = await loadModFromDir(bad);
    expect(result.ok).toBe(false);
    await rm(bad, { recursive: true, force: true });
  });

  it('loads a manifest-only module with no content/ directory', async () => {
    const minimal = await mkdtemp(join(tmpdir(), 'fateline-min-'));
    await writeFile(
      join(minimal, 'mod.yaml'),
      ['id: com.test.min', 'name: Min', 'version: 1.0.0', 'engineVersion: ">=0"', 'author: a'].join(
        '\n',
      ),
    );
    const result = await loadModFromDir(minimal);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.content.events).toEqual([]);
      expect(result.value.content.stats).toEqual([]);
    }
    await rm(minimal, { recursive: true, force: true });
  });
});

describe('extractItems', () => {
  it('returns [] for null/undefined', () => {
    expect(extractItems(null, 'events')).toEqual([]);
    expect(extractItems(undefined, 'events')).toEqual([]);
  });
  it('passes through a bare array', () => {
    expect(extractItems([1, 2], 'events')).toEqual([1, 2]);
  });
  it('unwraps a keyed array', () => {
    expect(extractItems({ stats: [{ id: 'a' }] }, 'stats')).toEqual([{ id: 'a' }]);
  });
  it('wraps a keyed non-array single value', () => {
    expect(extractItems({ stats: { id: 'a' } }, 'stats')).toEqual([{ id: 'a' }]);
  });
  it('wraps a bare single object that is not keyed', () => {
    expect(extractItems({ id: 'evt.one' }, 'events')).toEqual([{ id: 'evt.one' }]);
  });
});
