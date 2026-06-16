import { describe, expect, it } from 'vitest';
import { validateManifest } from './validate.js';

const valid = {
  id: 'com.author.medieval-life',
  name: 'Medieval Life',
  version: '1.2.0',
  engineVersion: '>=1.0.0 <2.0.0',
  author: 'Jane Doe',
  description: 'Adds a medieval era with knights, plagues, and royalty.',
  dependencies: [],
};

describe('validateManifest', () => {
  it('accepts a well-formed manifest and applies defaults', () => {
    const { description: _omit, dependencies: _deps, ...minimal } = valid;
    const result = validateManifest(minimal);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.description).toBe('');
      expect(result.value.dependencies).toEqual([]);
    }
  });

  it('rejects a malformed id with a readable, path-tagged error', () => {
    const result = validateManifest({ ...valid, id: 'NotReverseDns' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path === 'id')).toBe(true);
    }
  });

  it('rejects unknown keys (typos must not be silently ignored)', () => {
    const result = validateManifest({ ...valid, autho: 'typo' });
    expect(result.ok).toBe(false);
  });

  it('never throws on non-object input', () => {
    expect(validateManifest(null).ok).toBe(false);
    expect(validateManifest('nope').ok).toBe(false);
    expect(validateManifest(42).ok).toBe(false);
  });
});
