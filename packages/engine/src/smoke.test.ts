import { describe, expect, it } from 'vitest';
import { validateMod, type FatelineMod } from '@fateline/mod-schema';
import { compileRegistry } from './registry.js';
import { smokeTest } from './smoke.js';

function compile(raw: unknown) {
  const r = validateMod(raw);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return compileRegistry([r.value as FatelineMod]);
}

const manifest = {
  id: 'com.test.smoke',
  name: 'S',
  version: '1.0.0',
  engineVersion: '*',
  author: 'a',
  description: '',
  dependencies: [],
};

describe('smokeTest', () => {
  it('passes for a module whose lives terminate within bounds', () => {
    const reg = compile({
      manifest,
      content: {
        stats: [
          {
            id: 'health',
            label: 'H',
            min: 0,
            max: 100,
            default: 5,
            yearlyDelta: -1,
            exposeAs: 'health',
          },
        ],
        events: [],
      },
    });
    const report = smokeTest(reg, { lives: 10, maxYears: 50 });
    expect(report.ok).toBe(true);
    expect(report.problems).toHaveLength(0);
    expect(report.livesRun).toBe(10);
  });

  it('exercises events, actions, and relationships across lives', () => {
    const reg = compile({
      manifest,
      content: {
        stats: [
          {
            id: 'health',
            label: 'H',
            min: 0,
            max: 100,
            default: 8,
            yearlyDelta: -2,
            exposeAs: 'health',
          },
        ],
        events: [
          {
            id: 'evt.meet',
            weight: 1,
            conditions: [{ stat: 'age', op: '>=', value: 1 }],
            once: true,
            title: 'Meet',
            choices: [
              {
                text: 'ok',
                outcomes: [
                  { weight: 1, effects: [{ addRelationship: 'arch.friend' }], resultText: 'met' },
                ],
              },
            ],
          },
        ],
        actions: [
          {
            id: 'act.rest',
            label: 'Rest',
            conditions: [],
            outcomes: [
              { weight: 1, effects: [{ stat: 'health', op: '+', value: 1 }], resultText: 'r' },
            ],
          },
        ],
        archetypes: [
          { id: 'arch.friend', type: 'friend', defaultName: 'Sam', stats: { relationship: 50 } },
        ],
        relationshipActions: [
          {
            id: 'rel.compliment',
            label: 'Compliment',
            appliesTo: [],
            conditions: [],
            outcomes: [
              {
                weight: 1,
                effects: [{ 'rel.stat': 'relationship', op: '+', value: 1 }],
                resultText: 'nice',
              },
            ],
          },
        ],
        careers: [
          {
            id: 'career.job',
            title: 'Job',
            requirements: [{ stat: 'age', op: '>=', value: 2 }],
            levels: [{ title: 'Worker', salary: 1000 }],
          },
        ],
        education: [
          {
            id: 'edu.school',
            title: 'School',
            requirements: [{ stat: 'age', op: '>=', value: 1 }],
            years: 1,
            yearlyTuition: 10,
            grantsFlags: ['diploma'],
          },
        ],
        assetTypes: [
          {
            id: 'asset.trinket',
            label: 'Trinket',
            price: 100,
            yearlyUpkeep: 1,
            yearlyValueChange: 0.01,
            conditions: [],
          },
        ],
        ribbons: [{ id: 'ribbon.any', label: 'A Life', priority: 1, conditions: [] }],
      },
    });
    const report = smokeTest(reg, { lives: 5, maxYears: 40 });
    expect(report.ok).toBe(true);
  });

  it('flags a module with no terminal condition as non-terminating', () => {
    const reg = compile({
      manifest,
      content: {
        // No vitality stat and no decay => lives never end.
        stats: [{ id: 'mood', label: 'M', min: 0, max: 100, default: 50 }],
        events: [],
      },
    });
    const report = smokeTest(reg, { lives: 3, maxYears: 20 });
    expect(report.ok).toBe(false);
    expect(report.problems.every((p) => p.kind === 'did-not-terminate')).toBe(true);
  });
});
