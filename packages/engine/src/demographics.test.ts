import { describe, expect, it } from 'vitest';
import { validateMod, type FatelineMod } from '@fateline/mod-schema';
import { compileRegistry } from './registry.js';
import { createRng } from './rng.js';
import {
  generateIdentity,
  generateNpcName,
  generateName,
  rollBirthCandidates,
  randomGender,
} from './demographics.js';

function compile(raw: unknown) {
  const r = validateMod(raw);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return compileRegistry([r.value as FatelineMod]);
}

const manifest = {
  id: 'com.test.demo',
  name: 'D',
  version: '1.0.0',
  engineVersion: '*',
  author: 'a',
  description: '',
  dependencies: [],
};

function reg() {
  return compile({
    manifest,
    content: {
      ethnicities: [
        {
          id: 'eth.a',
          label: 'Ethnicity A',
          weight: 1,
          names: { male: ['Liam'], female: ['Emma'], neutral: ['Sky'], surnames: ['Stone'] },
        },
      ],
      countries: [
        {
          id: 'country.us',
          label: 'United States',
          code: 'US',
          weight: 1,
          cities: ['Springfield', 'Riverside'],
          ethnicities: ['eth.a'],
          names: { male: ['John'], female: ['Mary'], neutral: ['Alex'], surnames: ['Smith'] },
        },
      ],
    },
  });
}

describe('generateName', () => {
  it('picks a gender-appropriate given name + surname', () => {
    const r = reg();
    const country = r.countries.get('country.us')!;
    const eth = r.ethnicities.get('eth.a')!;
    const male = generateName(createRng(1), 'male', country, eth);
    // Given name must come from a male pool (Liam or John), surname from a pool.
    expect(['Liam', 'John']).toContain(male.split(' ')[0]);
    expect(['Stone', 'Smith']).toContain(male.split(' ')[1]);
  });

  it('falls back to Anonymous with no pools', () => {
    expect(generateName(createRng(1), 'x', undefined, undefined)).toBe('Anonymous');
  });
});

describe('generateIdentity', () => {
  it('is deterministic and fills all identity fields', () => {
    const r = reg();
    const a = generateIdentity(createRng(7), r);
    const b = generateIdentity(createRng(7), r);
    expect(a).toEqual(b);
    expect(a.country).toBe('country.us');
    expect(a.ethnicity).toBe('eth.a');
    expect(['Springfield', 'Riverside']).toContain(a.birthplace);
    expect(['male', 'female', 'x']).toContain(a.gender);
  });

  it('honors requested gender and country', () => {
    const r = reg();
    const id = generateIdentity(createRng(3), r, { gender: 'female', countryId: 'country.us' });
    expect(id.gender).toBe('female');
    expect(id.country).toBe('country.us');
  });
});

describe('rollBirthCandidates', () => {
  it('returns N candidates with display labels', () => {
    const r = reg();
    const candidates = rollBirthCandidates(createRng(1), r, 3);
    expect(candidates).toHaveLength(3);
    expect(candidates[0]!.countryLabel).toBe('United States');
    expect(candidates[0]!.ethnicityLabel).toBe('Ethnicity A');
  });
});

describe('npc helpers', () => {
  it('generateNpcName returns a name; randomGender returns a valid gender', () => {
    const r = reg();
    expect(generateNpcName(createRng(2), r, 'male').length).toBeGreaterThan(0);
    expect(['male', 'female', 'x']).toContain(randomGender(createRng(2)));
  });
});

describe('fallback paths', () => {
  it('handles an empty registry (no demographics) gracefully', () => {
    const empty = compile({ manifest, content: {} });
    const id = generateIdentity(createRng(1), empty);
    expect(id.name).toBe('Anonymous');
    expect(id.country).toBe('');
    expect(id.ethnicity).toBe('');
    expect(id.birthplace).toBe('');
    expect(rollBirthCandidates(createRng(1), empty, 2)).toHaveLength(2);
    expect(generateNpcName(createRng(1), empty, 'female')).toBe('Anonymous');
  });

  it('uses neutral names for nonbinary and global ethnicity fallback', () => {
    // Country with no listed ethnicities -> picks from global ethnicity pool.
    const r = compile({
      manifest,
      content: {
        ethnicities: [
          { id: 'eth.g', label: 'Global', names: { neutral: ['Robin'], surnames: ['Lee'] } },
        ],
        countries: [{ id: 'country.x', label: 'X', cities: ['Town'], ethnicities: [] }],
      },
    });
    const id = generateIdentity(createRng(1), r, { gender: 'x', countryId: 'country.x' });
    expect(id.gender).toBe('x');
    expect(id.ethnicity).toBe('eth.g'); // global fallback
    expect(id.name.startsWith('Robin')).toBe(true); // neutral pool used
  });
});
