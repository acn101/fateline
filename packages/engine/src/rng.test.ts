import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createRng, nextFloat, nextInt, seedFromString, weightedPick } from './rng.js';

describe('createRng / seedFromString', () => {
  it('produces a numeric uint32 state from a string seed', () => {
    const a = createRng('hello');
    expect(Number.isInteger(a.seed)).toBe(true);
    expect(a.seed).toBeGreaterThanOrEqual(0);
    expect(seedFromString('hello')).toBe(createRng('hello').seed);
  });
});

describe('determinism (README §4.3)', () => {
  it('same seed yields the same sequence', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 10 }, () => nextFloat(a));
    const seqB = Array.from({ length: 10 }, () => nextFloat(b));
    expect(seqA).toEqual(seqB);
  });

  it('different seeds diverge', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(nextFloat(a)).not.toEqual(nextFloat(b));
  });
});

describe('nextFloat / nextInt', () => {
  it('nextFloat stays in [0, 1)', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const r = createRng(seed);
        const v = nextFloat(r);
        return v >= 0 && v < 1;
      }),
    );
  });

  it('nextInt stays within inclusive bounds', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: -50, max: 50 }),
        fc.nat(100),
        (seed, min, span) => {
          const r = createRng(seed);
          const max = min + span;
          const v = nextInt(r, min, max);
          return v >= min && v <= max && Number.isInteger(v);
        },
      ),
    );
  });

  it('nextInt throws when min > max', () => {
    expect(() => nextInt(createRng(1), 5, 1)).toThrow(RangeError);
  });
});

describe('weightedPick', () => {
  it('always returns a valid index for positive weights', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.array(fc.nat(1000), { minLength: 1 }).filter((w) => w.some((x) => x > 0)),
        (seed, weights) => {
          const idx = weightedPick(createRng(seed), weights);
          return idx >= 0 && idx < weights.length && weights[idx]! > 0;
        },
      ),
    );
  });

  it('rejects negative weights and all-zero weights', () => {
    expect(() => weightedPick(createRng(1), [1, -1])).toThrow(RangeError);
    expect(() => weightedPick(createRng(1), [0, 0])).toThrow(RangeError);
  });

  it('respects weighting distribution over many draws', () => {
    const r = createRng('distribution');
    const counts = [0, 0];
    for (let i = 0; i < 10000; i++) counts[weightedPick(r, [90, 10])]!++;
    // index 0 should dominate ~9:1; loose bound to stay deterministic-safe.
    expect(counts[0]!).toBeGreaterThan(counts[1]! * 5);
  });
});
