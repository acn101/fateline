import { describe, expect, it } from 'vitest';
import { validateModule, type FatelineModule } from '@fateline/module-schema';
import { createGameStore } from './gameStore.js';
import { visibleStats } from './selectors.js';

function coreLikeModule(): FatelineModule {
  const raw = {
    manifest: {
      id: 'com.test.core',
      name: 'Core',
      version: '1.0.0',
      engineVersion: '*',
      author: 'a',
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
          default: 5,
          yearlyDelta: -1,
          exposeAs: 'health',
        },
        { id: 'secret', label: 'Secret', min: 0, max: 100, default: 0, showInUI: false },
      ],
      events: [
        {
          id: 'evt.test',
          weight: 1,
          conditions: [{ stat: 'age', op: '>=', value: 1 }],
          title: 'A choice appears.',
          choices: [
            {
              text: 'A',
              outcomes: [
                { weight: 1, effects: [{ stat: 'health', op: '+', value: 1 }], resultText: 'a' },
              ],
            },
            { text: 'B', outcomes: [{ weight: 1, effects: [], resultText: 'b' }] },
          ],
        },
      ],
    },
  };
  const r = validateModule(raw);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.value as FatelineModule;
}

describe('createGameStore', () => {
  it('runs the full session lifecycle', () => {
    const store = createGameStore();
    store.getState().loadModules([coreLikeModule()]);
    store.getState().startGame({
      seed: 1,
      character: { name: 'A', gender: 'x', birthYear: 2000 },
      assets: { money: 0 },
    });

    expect(store.getState().game?.character.age).toBe(0);
    store.getState().advance();
    const pending = store.getState().pending;
    expect(pending?.event.id).toBe('evt.test');

    store.getState().choose(0);
    expect(store.getState().pending).toBeNull();
    expect(store.getState().game?.history.length).toBeGreaterThan(0);
  });

  it('guards against invalid transitions', () => {
    const store = createGameStore();
    expect(() =>
      store
        .getState()
        .startGame({ seed: 1, character: { name: 'A', gender: 'x', birthYear: 2000 } }),
    ).toThrow();
    store.getState().loadModules([coreLikeModule()]);
    store.getState().startGame({ seed: 1, character: { name: 'A', gender: 'x', birthYear: 2000 } });
    expect(() => store.getState().choose(0)).toThrow(); // no pending event
    store.getState().advance();
    expect(() => store.getState().advance()).toThrow(); // pending unresolved
  });

  it('does not advance a dead character', () => {
    const store = createGameStore();
    store.getState().loadModules([coreLikeModule()]);
    store.getState().startGame({ seed: 2, character: { name: 'A', gender: 'x', birthYear: 2000 } });
    const g = store.getState().game!;
    g.character.alive = false;
    store.getState().hydrate(g);
    store.getState().advance();
    expect(store.getState().game?.character.age).toBe(0);
  });
});

describe('visibleStats selector', () => {
  it('includes only showInUI stats, joined with current values', () => {
    const store = createGameStore();
    store.getState().loadModules([coreLikeModule()]);
    store.getState().startGame({ seed: 1, character: { name: 'A', gender: 'x', birthYear: 2000 } });
    const stats = visibleStats(store.getState().registry!, store.getState().game!);
    expect(stats.map((s) => s.id)).toEqual(['health']);
    expect(stats[0]!.label).toBe('Health');
    expect(stats[0]!.value).toBe(5);
  });

  it('falls back to the declared default when a value is missing', () => {
    const store = createGameStore();
    store.getState().loadModules([coreLikeModule()]);
    store.getState().startGame({ seed: 1, character: { name: 'A', gender: 'x', birthYear: 2000 } });
    const game = store.getState().game!;
    delete game.stats['health'];
    const stats = visibleStats(store.getState().registry!, game);
    expect(stats[0]!.value).toBe(5); // def.default
  });
});
