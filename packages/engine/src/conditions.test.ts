import { describe, expect, it } from 'vitest';
import type { Condition } from '@fateline/mod-schema';
import { evaluateCondition, evaluateAll } from './conditions.js';
import { createRng } from './rng.js';
import type { GameState } from './state.js';

function stateWith(overrides: Partial<GameState> = {}): GameState {
  return {
    character: { id: 'pc', name: 'Test', gender: 'x', age: 18, alive: true, birthYear: 2000 },
    stats: { 'core.happiness': 50 },
    flags: { in_jail: false },
    assets: { money: 100 },
    history: [],
    rng: createRng(1),
    eventMemory: {},
    actionMemory: {},
    installedMods: {},
    ...overrides,
  };
}

describe('comparison operators', () => {
  const s = stateWith();
  const cases: Array<[Condition, boolean]> = [
    [{ stat: 'age', op: '>=', value: 6 }, true],
    [{ stat: 'age', op: '<', value: 18 }, false],
    [{ stat: 'age', op: '==', value: 18 }, true],
    [{ stat: 'age', op: '!=', value: 18 }, false],
    [{ stat: 'core.happiness', op: '>', value: 49 }, true],
    [{ asset: 'money', op: '<=', value: 100 }, true],
    [{ flag: 'in_jail', op: '==', value: false }, true],
    [{ stat: 'age', op: 'in', value: [17, 18, 19] }, true],
    [{ stat: 'age', op: 'in', value: [1, 2] }, false],
  ];
  it.each(cases)('evaluates %o => %s', (cond, expected) => {
    expect(evaluateCondition(cond, s, createRng(1))).toBe(expected);
  });
});

describe('grouping', () => {
  const s = stateWith();
  it('all requires every child', () => {
    const cond: Condition = {
      all: [
        { stat: 'age', op: '>=', value: 6 },
        { flag: 'in_jail', op: '==', value: false },
      ],
    };
    expect(evaluateCondition(cond, s, createRng(1))).toBe(true);
  });
  it('any requires at least one child', () => {
    const cond: Condition = {
      any: [
        { stat: 'age', op: '>', value: 999 },
        { flag: 'in_jail', op: '==', value: false },
      ],
    };
    expect(evaluateCondition(cond, s, createRng(1))).toBe(true);
  });
  it('nested groups compose', () => {
    const cond: Condition = {
      all: [
        {
          any: [
            { stat: 'age', op: '<', value: 5 },
            { stat: 'age', op: '>=', value: 18 },
          ],
        },
      ],
    };
    expect(evaluateCondition(cond, s, createRng(1))).toBe(true);
  });
  it('empty list is vacuously true', () => {
    expect(evaluateAll([], s, createRng(1))).toBe(true);
  });
});

describe('random leaf', () => {
  it('is deterministic for a fixed seed', () => {
    const cond: Condition = { random: true, op: '<', value: 0.5 };
    const a = evaluateCondition(cond, stateWith(), createRng(42));
    const b = evaluateCondition(cond, stateWith(), createRng(42));
    expect(a).toBe(b);
  });
  it('an unreachable threshold is always false', () => {
    const cond: Condition = { random: true, op: '<', value: 0 };
    expect(evaluateCondition(cond, stateWith(), createRng(7))).toBe(false);
  });
});
