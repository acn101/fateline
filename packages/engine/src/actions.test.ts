import { describe, expect, it } from 'vitest';
import { validateMod, type FatelineMod } from '@fateline/mod-schema';
import { compileRegistry } from './registry.js';
import { createGame, ageUp } from './turn.js';
import { availableActions, takeAction, canAfford } from './actions.js';

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

function reg(actions: unknown[]) {
  return compile({
    manifest,
    content: {
      stats: [{ id: 'health', label: 'H', min: 0, max: 100, default: 50, exposeAs: 'health' }],
      events: [],
      actions,
    },
  });
}

const gym = {
  id: 'act.gym',
  label: 'Go to the gym',
  conditions: [{ stat: 'age', op: '>=', value: 1 }],
  cost: { money: 50 },
  perYearLimit: 2,
  outcomes: [
    { weight: 1, effects: [{ stat: 'health', op: '+', value: 5 }], resultText: 'Worked out.' },
  ],
};

function newGame(r: ReturnType<typeof reg>, money = 1000) {
  const g = createGame(r, {
    seed: 1,
    character: { name: 'A', gender: 'x', birthYear: 2000 },
    assets: { money },
  });
  ageUp(g, r); // advance to age 1 so age>=1 conditions pass
  return g;
}

describe('availableActions', () => {
  it('lists actions whose conditions pass and cost is affordable', () => {
    const r = reg([gym]);
    const g = newGame(r);
    expect(availableActions(g, r).map((a) => a.id)).toEqual(['act.gym']);
  });

  it('excludes unaffordable actions', () => {
    const r = reg([gym]);
    const g = newGame(r, 10); // can't afford the $50 gym
    expect(availableActions(g, r)).toHaveLength(0);
    expect(canAfford(gym as never, g)).toBe(false);
  });

  it('returns nothing for a dead character', () => {
    const r = reg([gym]);
    const g = newGame(r);
    g.character.alive = false;
    expect(availableActions(g, r)).toHaveLength(0);
  });
});

describe('takeAction', () => {
  it('debits cost, applies effects, records history and usage', () => {
    const r = reg([gym]);
    const g = newGame(r);
    const before = g.stats['health']!;
    expect(takeAction(g, r, 'act.gym')).toBeNull();
    expect(g.assets['money']).toBe(950);
    expect(g.stats['health']).toBe(before + 5);
    expect(g.actionMemory['act.gym']).toBe(1);
    expect(g.history.at(-1)?.text).toBe('Go to the gym');
  });

  it('enforces perYearLimit, and the limit resets after age-up', () => {
    const r = reg([gym]);
    const g = newGame(r);
    expect(takeAction(g, r, 'act.gym')).toBeNull();
    expect(takeAction(g, r, 'act.gym')).toBeNull();
    expect(takeAction(g, r, 'act.gym')).toBe('unavailable'); // limit 2 hit
    ageUp(g, r);
    expect(g.actionMemory['act.gym']).toBeUndefined(); // reset
    expect(takeAction(g, r, 'act.gym')).toBeNull();
  });

  it('rejects unknown actions and acting while dead', () => {
    const r = reg([gym]);
    const g = newGame(r);
    expect(takeAction(g, r, 'act.nope')).toBe('not-found');
    g.character.alive = false;
    expect(takeAction(g, r, 'act.gym')).toBe('dead');
  });

  it('rejects an unaffordable action', () => {
    const r = reg([gym]);
    const g = newGame(r, 0);
    expect(takeAction(g, r, 'act.gym')).toBe('unavailable');
  });

  it('handles a no-cost, no-limit action (always affordable/available)', () => {
    const rest = {
      id: 'act.rest',
      label: 'Rest',
      conditions: [],
      outcomes: [
        { weight: 1, effects: [{ stat: 'health', op: '+', value: 1 }], resultText: 'Rested.' },
      ],
    };
    const r = reg([rest]);
    const g = newGame(r, 0);
    expect(canAfford(rest as never, g)).toBe(true);
    expect(availableActions(g, r).map((a) => a.id)).toContain('act.rest');
    // No limit -> can take repeatedly.
    expect(takeAction(g, r, 'act.rest')).toBeNull();
    expect(takeAction(g, r, 'act.rest')).toBeNull();
  });

  it('rejects an action whose conditions no longer hold at take time', () => {
    const gated = {
      id: 'act.adult-only',
      label: 'Adults only',
      conditions: [{ stat: 'age', op: '>=', value: 100 }],
      outcomes: [{ weight: 1, effects: [], resultText: 'ok' }],
    };
    const r = reg([gated]);
    const g = newGame(r); // age 1, condition (age>=100) fails
    expect(availableActions(g, r)).toHaveLength(0);
    expect(takeAction(g, r, 'act.adult-only')).toBe('unavailable');
  });
});
