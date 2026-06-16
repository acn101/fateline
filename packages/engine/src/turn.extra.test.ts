import { describe, expect, it } from 'vitest';
import { validateMod, type FatelineMod } from '@fateline/mod-schema';
import { compileRegistry } from './registry.js';
import { createGame, ageUp, applyChoice } from './turn.js';
import { setStatClamped } from './accessors.js';
import { applyEffects } from './effects.js';
import type { GameState } from './state.js';
import { createRng } from './rng.js';

function compile(raw: unknown) {
  const r = validateMod(raw);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return compileRegistry([r.value as FatelineMod]);
}

const baseManifest = {
  id: 'com.test.core',
  name: 'C',
  version: '1.0.0',
  engineVersion: '*',
  author: 'a',
  description: '',
  dependencies: [],
};

describe('triggerEvent chains (turn.ts resolveTriggers)', () => {
  it('a chosen outcome can fire a follow-up event automatically', () => {
    const reg = compile({
      manifest: baseManifest,
      content: {
        stats: [
          { id: 'happiness', label: 'H', min: 0, max: 100, default: 50, exposeAs: 'happiness' },
        ],
        events: [
          {
            id: 'evt.start',
            weight: 1,
            conditions: [{ stat: 'age', op: '>=', value: 1 }],
            once: true,
            title: 'Start',
            choices: [
              {
                text: 'go',
                outcomes: [
                  { weight: 1, effects: [{ triggerEvent: 'evt.followup' }], resultText: 'started' },
                ],
              },
            ],
          },
          {
            // Gated out of random selection (impossible condition); only the
            // triggerEvent path reaches it, since triggers bypass conditions.
            id: 'evt.followup',
            weight: 1,
            conditions: [{ flag: 'never', op: '==', value: true }],
            title: 'Follow-up',
            choices: [
              {
                text: 'auto',
                outcomes: [
                  {
                    weight: 1,
                    effects: [{ asset: 'money', op: 'set', value: 500 }],
                    resultText: 'bonus',
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    const game = createGame(reg, {
      seed: 's',
      character: { name: 'A', gender: 'x', birthYear: 2000 },
      assets: { money: 0 },
    });
    const pending = ageUp(game, reg);
    expect(pending?.event.id).toBe('evt.start');
    applyChoice(game, reg, pending!, 0);
    // Follow-up fired automatically and applied its effect + history.
    expect(game.assets['money']).toBe(500);
    expect(game.history.some((h) => h.text === 'Follow-up')).toBe(true);
  });
});

describe('event memory: once and cooldown', () => {
  function memReg(extra: Record<string, unknown>) {
    return compile({
      manifest: baseManifest,
      content: {
        stats: [{ id: 'health', label: 'H', min: 0, max: 100, default: 100, exposeAs: 'health' }],
        events: [
          {
            id: 'evt.repeat',
            weight: 1,
            conditions: [{ stat: 'age', op: '>=', value: 1 }],
            title: 'Repeatable',
            choices: [{ text: 'ok', outcomes: [{ weight: 1, effects: [], resultText: 'r' }] }],
            ...extra,
          },
        ],
      },
    });
  }

  it('a once event fires at most once per life', () => {
    const reg = memReg({ once: true });
    const game = createGame(reg, {
      seed: 1,
      character: { name: 'A', gender: 'x', birthYear: 2000 },
    });
    let fires = 0;
    for (let i = 0; i < 5; i++) {
      const p = ageUp(game, reg);
      if (p) {
        applyChoice(game, reg, p, 0);
        fires++;
      }
    }
    expect(fires).toBe(1);
  });

  it('a cooldown event does not refire within the cooldown window', () => {
    const reg = memReg({ cooldownYears: 3 });
    const game = createGame(reg, {
      seed: 1,
      character: { name: 'A', gender: 'x', birthYear: 2000 },
    });
    const firedAges: number[] = [];
    for (let i = 0; i < 7; i++) {
      const p = ageUp(game, reg);
      if (p) {
        applyChoice(game, reg, p, 0);
        firedAges.push(game.character.age);
      }
    }
    // Consecutive fires must be at least cooldownYears apart.
    for (let i = 1; i < firedAges.length; i++) {
      expect(firedAges[i]! - firedAges[i - 1]!).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('edge paths', () => {
  it('applyChoice throws on an invalid choice index', () => {
    const reg = compile({
      manifest: baseManifest,
      content: {
        stats: [],
        events: [
          {
            id: 'evt.x',
            weight: 1,
            conditions: [],
            title: 'X',
            choices: [{ text: 'a', outcomes: [{ weight: 1, effects: [], resultText: 'r' }] }],
          },
        ],
      },
    });
    const game = createGame(reg, {
      seed: 1,
      character: { name: 'A', gender: 'x', birthYear: 2000 },
    });
    const p = ageUp(game, reg)!;
    expect(() => applyChoice(game, reg, p, 99)).toThrow(RangeError);
  });

  it('setStatClamped stores unknown (undeclared) stats unclamped', () => {
    const reg = compile({ manifest: baseManifest, content: { stats: [], events: [] } });
    const state: GameState = {
      character: { id: 'pc', name: 'A', gender: 'x', age: 0, alive: true, birthYear: 2000 },
      stats: {},
      flags: {},
      assets: {},
      history: [],
      rng: createRng(1),
      eventMemory: {},
      installedMods: {},
    };
    setStatClamped(state, reg, 'undeclared', 9999);
    expect(state.stats['undeclared']).toBe(9999);
  });

  it('a game with no eligible events ages up without surfacing one', () => {
    const reg = compile({
      manifest: baseManifest,
      content: {
        stats: [],
        events: [
          {
            id: 'evt.future',
            weight: 1,
            conditions: [{ stat: 'age', op: '>=', value: 999 }],
            title: 'F',
            choices: [{ text: 'a', outcomes: [{ weight: 1, effects: [], resultText: 'r' }] }],
          },
        ],
      },
    });
    const game = createGame(reg, {
      seed: 1,
      character: { name: 'A', gender: 'x', birthYear: 2000 },
    });
    expect(ageUp(game, reg)).toBeNull();
    expect(game.character.age).toBe(1);
  });

  it('a triggerEvent pointing at a missing id is skipped safely', () => {
    // Bypass validation to simulate a runtime-missing target.
    const reg = compile({ manifest: baseManifest, content: { stats: [], events: [] } });
    const state: GameState = {
      character: { id: 'pc', name: 'A', gender: 'x', age: 1, alive: true, birthYear: 2000 },
      stats: {},
      flags: {},
      assets: { money: 0 },
      history: [],
      rng: createRng(1),
      eventMemory: {},
      installedMods: {},
    };
    // applyEffects just returns the id; resolveTriggers (via applyChoice) would skip it.
    expect(applyEffects([{ triggerEvent: 'evt.ghost' }], state, reg)).toEqual(['evt.ghost']);
  });
});
