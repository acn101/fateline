import { describe, expect, it } from 'vitest';
import { validateMod, type FatelineMod } from '@fateline/mod-schema';
import { compileRegistry } from './registry.js';
import { createGame, ageUp } from './turn.js';
import { applyToJob, quitJob, enroll, availableCareers, availablePrograms } from './careers.js';

function compile(raw: unknown) {
  const r = validateMod(raw);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return compileRegistry([r.value as FatelineMod]);
}

const manifest = {
  id: 'com.test.core',
  name: 'C',
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
      stats: [{ id: 'health', label: 'H', min: 0, max: 100, default: 100, exposeAs: 'health' }],
      careers: [
        {
          id: 'career.retail',
          title: 'Retail',
          field: 'service',
          requirements: [{ stat: 'age', op: '>=', value: 16 }],
          levels: [
            { title: 'Clerk', salary: 20000, promoteAfterYears: 1, promoteChance: 1 },
            { title: 'Manager', salary: 45000 },
          ],
        },
        {
          id: 'career.doctor',
          title: 'Doctor',
          field: 'medicine',
          requirements: [{ flag: 'degree_med', op: '==', value: true }],
          levels: [{ title: 'Physician', salary: 200000 }],
        },
      ],
      education: [
        {
          id: 'edu.med-school',
          title: 'Medical School',
          requirements: [{ stat: 'age', op: '>=', value: 18 }],
          years: 2,
          yearlyTuition: 1000,
          grantsFlags: ['degree_med'],
        },
      ],
    },
  });
}

function newGameAtAge(r: ReturnType<typeof reg>, age: number) {
  const g = createGame(r, {
    seed: 1,
    character: { name: 'A', gender: 'x', birthYear: 2000 },
    assets: { money: 0 },
  });
  for (let i = 0; i < age; i++) ageUp(g, r);
  return g;
}

describe('careers', () => {
  it('availableCareers reflects requirements and employment', () => {
    const r = reg();
    const g = newGameAtAge(r, 16);
    expect(availableCareers(g, r).map((c) => c.id)).toEqual(['career.retail']); // doctor needs degree
    applyToJob(g, r, 'career.retail');
    expect(availableCareers(g, r)).toHaveLength(0); // already employed
  });

  it('applyToJob enforces requirements and single employment', () => {
    const r = reg();
    const g = newGameAtAge(r, 10); // too young
    expect(applyToJob(g, r, 'career.retail')).toBe('requirements');
    expect(applyToJob(g, r, 'career.nope')).toBe('no-career');
    const adult = newGameAtAge(r, 16);
    expect(applyToJob(adult, r, 'career.retail')).toBeNull();
    expect(applyToJob(adult, r, 'career.retail')).toBe('already-employed');
  });

  it('pays salary each year and promotes up the ladder', () => {
    const r = reg();
    const g = newGameAtAge(r, 16);
    applyToJob(g, r, 'career.retail');
    ageUp(g, r); // year 1: +20000, then promote check (chance 1) -> Manager
    expect(g.career?.level).toBe(1);
    expect(g.assets['money']).toBe(20000);
    ageUp(g, r); // year 2 at Manager: +45000
    expect(g.assets['money']).toBe(65000);
  });

  it('quitJob clears employment', () => {
    const r = reg();
    const g = newGameAtAge(r, 16);
    applyToJob(g, r, 'career.retail');
    quitJob(g);
    expect(g.career).toBeNull();
    quitJob(g); // no-op when unemployed
  });
});

describe('education', () => {
  it('enroll -> graduate grants flags and unlocks gated careers', () => {
    const r = reg();
    const g = newGameAtAge(r, 18);
    g.assets['money'] = 5000;
    expect(availablePrograms(g, r).map((p) => p.id)).toEqual(['edu.med-school']);
    expect(enroll(g, r, 'edu.med-school')).toBeNull();
    expect(enroll(g, r, 'edu.med-school')).toBe('already-enrolled');

    ageUp(g, r); // year 1 tuition
    expect(g.flags['degree_med']).toBeUndefined();
    ageUp(g, r); // year 2 -> graduate
    expect(g.flags['degree_med']).toBe(true);
    expect(g.education).toBeNull();
    expect(g.assets['money']).toBe(3000); // 5000 - 2*1000 tuition
    // The degree now unlocks the doctor career.
    expect(availableCareers(g, r).map((c) => c.id)).toContain('career.doctor');
  });

  it('enroll enforces requirements and unknown programs', () => {
    const r = reg();
    const young = newGameAtAge(r, 10);
    expect(enroll(young, r, 'edu.med-school')).toBe('requirements');
    expect(enroll(young, r, 'edu.nope')).toBe('no-program');
  });
});
