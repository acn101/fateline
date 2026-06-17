import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { assembleMod } from './assemble.js';
import { unzipMod, commonPrefix } from './unzip.js';
import {
  fromPaste,
  fromUpload,
  fromGithub,
  parseGithubUrl,
  fetchRegistry,
  fromRegistryEntry,
} from './sources.js';
import { installMod, loadInstalled } from './install.js';
import { createMemoryModStore } from './memoryStore.js';

const MANIFEST = [
  'manifest:',
  '  id: com.test.mod',
  '  name: Test Mod',
  '  version: 1.0.0',
  '  engineVersion: ">=0.0.0"',
  '  author: Tester',
].join('\n');

const MODULE_YAML = [
  'id: com.test.mod',
  'name: Test Mod',
  'version: 1.0.0',
  'engineVersion: ">=0.0.0"',
  'author: Tester',
].join('\n');

const STATS_YAML = [
  'stats:',
  '  - id: karma',
  '    label: Karma',
  '    min: -100',
  '    max: 100',
  '    default: 0',
].join('\n');

/** Build a GitHub-style zip (everything under a top-level folder). */
function makeRepoZip(): Uint8Array {
  return zipSync({
    'repo-main/mod.yaml': strToU8(MODULE_YAML),
    'repo-main/content/definitions/stats.yaml': strToU8(STATS_YAML),
  });
}

describe('assembleMod', () => {
  it('assembles + validates from an in-memory file map', () => {
    const result = assembleMod({
      'mod.yaml': MODULE_YAML,
      'content/definitions/stats.yaml': STATS_YAML,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.content.stats[0]!.id).toBe('karma');
  });

  it('rejects files with no manifest', () => {
    const result = assembleMod({ 'content/events/a.yaml': '[]' });
    expect(result.ok).toBe(false);
  });

  it('accepts a stats file written as a single wrapped object', () => {
    // `stats:` mapping to a single object (not an array) -> wrapped into a list.
    const single = [
      'stats:',
      '  id: karma',
      '  label: Karma',
      '  min: 0',
      '  max: 10',
      '  default: 0',
    ].join('\n');
    const result = assembleMod({
      'mod.yaml': MODULE_YAML,
      'content/definitions/stats.yaml': single,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.content.stats).toHaveLength(1);
  });

  it('ignores unknown content folders', () => {
    const result = assembleMod({
      'mod.yaml': MODULE_YAML,
      'content/locations/x.yaml': 'id: c',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.content.events).toEqual([]);
  });
});

describe('unzip', () => {
  it('strips the common top-level folder', () => {
    const files = unzipMod(makeRepoZip());
    expect(Object.keys(files).sort()).toEqual(['content/definitions/stats.yaml', 'mod.yaml']);
  });
  it('commonPrefix handles no-folder and mixed cases', () => {
    expect(commonPrefix(['a/x', 'a/y'])).toBe('a/');
    expect(commonPrefix(['x', 'y'])).toBe('');
    expect(commonPrefix([])).toBe('');
  });
});

describe('sources', () => {
  it('fromPaste wraps text as mod.yaml (manifest-wrapped or bare)', () => {
    expect(fromPaste(MANIFEST)['mod.yaml']).toBe(MANIFEST);
    expect(fromPaste(MODULE_YAML)['mod.yaml']).toBe(MODULE_YAML);
  });

  it('fromUpload handles zip bytes and text files', () => {
    expect(Object.keys(fromUpload('m.zip', makeRepoZip()))).toContain('mod.yaml');
    expect(fromUpload('m.yaml', MODULE_YAML)['mod.yaml']).toBe(MODULE_YAML);
    expect(() => fromUpload('m.zip', 'text')).toThrow();
  });

  it('parseGithubUrl handles repo, tree, and release forms', () => {
    expect(parseGithubUrl('https://github.com/o/r')).toEqual({
      owner: 'o',
      repo: 'r',
      ref: 'HEAD',
    });
    expect(parseGithubUrl('https://github.com/o/r/tree/dev')?.ref).toBe('dev');
    expect(parseGithubUrl('https://github.com/o/r/releases/tag/v2')?.ref).toBe('v2');
    expect(parseGithubUrl('https://example.com/x')).toBeNull();
  });

  it('fromGithub downloads + unzips via the codeload URL', async () => {
    const fetcher = (async (url: string) => {
      expect(url).toBe('https://codeload.github.com/o/r/zip/HEAD');
      return { ok: true, arrayBuffer: async () => makeRepoZip().buffer } as Response;
    }) as unknown as typeof fetch;
    const files = await fromGithub('https://github.com/o/r', fetcher);
    expect(files['mod.yaml']).toBe(MODULE_YAML);
  });

  it('fromGithub throws on a bad URL or failed download', async () => {
    await expect(fromGithub('https://example.com/x')).rejects.toThrow();
    const bad = (async () => ({ ok: false, status: 404 }) as Response) as unknown as typeof fetch;
    await expect(fromGithub('https://github.com/o/r', bad)).rejects.toThrow(/404/);
  });

  it('fetchRegistry + fromRegistryEntry work end to end', async () => {
    const fetcher = (async (url: string) => {
      if (url === 'https://reg/index.json') {
        return {
          ok: true,
          json: async () => ({
            modules: [
              { id: 'com.test.mod', name: 'M', description: 'd', source: 'https://github.com/o/r' },
            ],
          }),
        } as Response;
      }
      return { ok: true, arrayBuffer: async () => makeRepoZip().buffer } as Response;
    }) as unknown as typeof fetch;

    const entries = await fetchRegistry('https://reg/index.json', fetcher);
    expect(entries[0]!.id).toBe('com.test.mod');
    const files = await fromRegistryEntry(entries[0]!, fetcher);
    expect(files['mod.yaml']).toBe(MODULE_YAML);
  });

  it('fetchRegistry throws on failure and tolerates an empty index', async () => {
    const bad = (async () => ({ ok: false, status: 500 }) as Response) as unknown as typeof fetch;
    await expect(fetchRegistry('https://reg', bad)).rejects.toThrow();
    const empty = (async () =>
      ({ ok: true, json: async () => ({}) }) as Response) as unknown as typeof fetch;
    expect(await fetchRegistry('https://reg', empty)).toEqual([]);
  });
});

describe('install pipeline', () => {
  it('installs a valid module and registers load order', async () => {
    const { store, data } = createMemoryModStore();
    const result = await installMod({ 'mod.yaml': MODULE_YAML }, store);
    expect(result.ok).toBe(true);
    expect(data.order).toEqual(['com.test.mod']);

    // Re-installing (update) must not duplicate the load-order entry.
    await installMod({ 'mod.yaml': MODULE_YAML }, store);
    expect(data.order).toEqual(['com.test.mod']);
  });

  it('does not store an invalid module', async () => {
    const { store, data } = createMemoryModStore();
    const result = await installMod(
      { 'mod.yaml': 'id: BAD\nname: x\nversion: 1.0.0\nengineVersion: ">=0"\nauthor: a' },
      store,
    );
    expect(result.ok).toBe(false);
    expect(data.order).toEqual([]);
  });

  it('loadInstalled withholds modules with unmet dependencies (§5.5)', async () => {
    const { store } = createMemoryModStore();
    await installMod({ 'mod.yaml': MODULE_YAML }, store);
    // A second module depending on a missing id.
    await installMod(
      {
        'mod.yaml': [
          'id: com.test.dependent',
          'name: Dependent',
          'version: 1.0.0',
          'engineVersion: ">=0"',
          'author: a',
          'dependencies:',
          '  - { id: com.test.absent, version: ">=1.0.0" }',
        ].join('\n'),
      },
      store,
    );
    const { modules, missingDependencies } = await loadInstalled(store);
    expect(modules.map((m) => m.manifest.id)).toEqual(['com.test.mod']);
    expect(missingDependencies[0]).toEqual({
      id: 'com.test.dependent',
      missing: ['com.test.absent'],
    });
  });

  it('remove and setOrder manage the store', async () => {
    const { store, data } = createMemoryModStore();
    await installMod({ 'mod.yaml': MODULE_YAML }, store);
    await store.setOrder(['com.test.mod']);
    await store.remove('com.test.mod');
    expect(data.order).toEqual([]);
    expect(await store.get('com.test.mod')).toBeNull();
  });
});
