import { describe, expect, it } from 'vitest';
import { validateModule, type FatelineModule } from '@fateline/module-schema';
import { compileRegistry } from './registry.js';
import { smokeTest } from './smoke.js';

function compile(raw: unknown) {
  const r = validateModule(raw);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return compileRegistry([r.value as FatelineModule]);
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
