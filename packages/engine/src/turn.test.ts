import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { validateModule, type FatelineModule } from '@fateline/module-schema';
import { compileRegistry } from './registry.js';
import { createGame, ageUp, applyChoice } from './turn.js';

/**
 * A minimal but complete module used as a test fixture — mirrors what
 * `modules/core/` will provide. Validated through the real schema so the test
 * exercises the same path a community module would.
 */
function buildRegistry() {
  const raw = {
    manifest: {
      id: 'com.test.core',
      name: 'Test Core',
      version: '1.0.0',
      engineVersion: '>=0.0.0',
      author: 'Test',
      description: '',
      dependencies: [],
    },
    content: {
      stats: [
        {
          id: 'health',
          label: 'Health',
          min: 0,
          max: 100,
          default: 100,
          yearlyDelta: -1,
          exposeAs: 'health',
        },
        { id: 'happiness', label: 'Happiness', min: 0, max: 100, default: 50 },
      ],
      events: [
        {
          id: 'evt.gift',
          weight: 1,
          conditions: [{ stat: 'age', op: '>=', value: 1 }],
          title: 'You received a gift.',
          choices: [
            {
              text: 'Accept',
              outcomes: [
                {
                  weight: 1,
                  effects: [{ asset: 'money', op: '+', value: 50 }],
                  resultText: 'Got $50.',
                },
              ],
            },
          ],
        },
      ],
    },
  };
  const result = validateModule(raw);
  if (!result.ok) throw new Error('fixture invalid: ' + JSON.stringify(result.errors));
  return compileRegistry([result.value as FatelineModule]);
}

describe('createGame', () => {
  it('seeds stats from declarations and starts at age 0', () => {
    const reg = buildRegistry();
    const game = createGame(reg, {
      seed: 1,
      character: { name: 'A', gender: 'x', birthYear: 2000 },
      assets: { money: 0 },
    });
    expect(game.character.age).toBe(0);
    expect(game.stats['health']).toBe(100);
    expect(game.stats['com.test.core.happiness']).toBe(50);
  });
});

describe('golden life (README §11.1) — fixed seed + scripted choices => exact state', () => {
  it('produces a deterministic final state', () => {
    const reg = buildRegistry();
    const play = () => {
      const game = createGame(reg, {
        seed: 'golden',
        character: { name: 'A', gender: 'x', birthYear: 2000 },
        assets: { money: 0 },
      });
      for (let i = 0; i < 5; i++) {
        const pending = ageUp(game, reg);
        if (pending) applyChoice(game, reg, pending, 0);
      }
      return game;
    };
    const a = play();
    const b = play();

    // Determinism: two identical runs match exactly.
    expect(a).toEqual(b);

    // Exact assertions (the "golden" values for this seed + script).
    expect(a.character.age).toBe(5);
    expect(a.character.alive).toBe(true);
    expect(a.stats['health']).toBe(95); // 100 - 1*5 yearly decay
    expect(a.assets['money']).toBe(
      a.history.filter((h) => h.resultText === 'Got $50.').length * 50,
    );
  });
});

describe('invariants (property-based)', () => {
  const reg = buildRegistry();

  it('stats always stay within declared bounds; loop always terminates', () => {
    fc.assert(
      fc.property(fc.integer(), fc.array(fc.nat(1), { maxLength: 30 }), (seed, choices) => {
        const game = createGame(reg, {
          seed,
          character: { name: 'A', gender: 'x', birthYear: 2000 },
          assets: { money: 0 },
        });
        for (const c of choices) {
          const pending = ageUp(game, reg);
          if (pending)
            applyChoice(game, reg, pending, Math.min(c, pending.event.choices.length - 1));
        }
        const h = game.stats['health']!;
        const hap = game.stats['com.test.core.happiness']!;
        return (
          h >= 0 && h <= 100 && hap >= 0 && hap <= 100 && game.character.age === choices.length
        );
      }),
    );
  });

  it('a dead character never ages up again', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const game = createGame(reg, {
          seed,
          character: { name: 'A', gender: 'x', birthYear: 2000 },
        });
        // Force death, then attempt to age up many times.
        game.stats['health'] = 0;
        game.character.alive = false;
        const ageBefore = game.character.age;
        for (let i = 0; i < 10; i++) expect(ageUp(game, reg)).toBeNull();
        return game.character.age === ageBefore;
      }),
    );
  });
});

describe('death', () => {
  it('character dies when vitality stat hits its minimum', () => {
    const reg = buildRegistry();
    const game = createGame(reg, {
      seed: 1,
      character: { name: 'A', gender: 'x', birthYear: 2000 },
    });
    game.stats['health'] = 1;
    // One age-up applies -1 decay => health 0 => death.
    ageUp(game, reg);
    expect(game.character.alive).toBe(false);
    expect(game.history.at(-1)?.text).toBe('You died.');
  });
});
