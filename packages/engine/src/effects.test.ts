import { describe, expect, it } from 'vitest';
import type { Effect, FatelineMod } from '@fateline/mod-schema';
import { applyEffects } from './effects.js';
import { compileRegistry, type Registry } from './registry.js';
import { createRng } from './rng.js';
import type { GameState } from './state.js';

function registryWith(): Registry {
  const mod: FatelineMod = {
    manifest: {
      id: 'com.t.core',
      name: 'C',
      version: '1.0.0',
      engineVersion: '*',
      author: 'a',
      description: '',
      dependencies: [],
    },
    content: {
      stats: [
        {
          id: 'happiness',
          label: 'Happiness',
          min: 0,
          max: 100,
          default: 50,
          showInUI: true,
          yearlyDelta: 0,
        },
      ],
      events: [],
    },
  };
  return compileRegistry([mod]);
}

function freshState(): GameState {
  return {
    character: { id: 'pc', name: 'T', gender: 'x', age: 10, alive: true, birthYear: 2000 },
    stats: { 'com.t.core.happiness': 50 },
    flags: {},
    assets: { money: 100 },
    history: [],
    rng: createRng(1),
    eventMemory: {},
    actionMemory: {},
    installedMods: {},
  };
}

describe('numeric effects', () => {
  it('applies +, -, *, set to stats and assets', () => {
    const r = registryWith();
    const s = freshState();
    applyEffects(
      [
        { stat: 'com.t.core.happiness', op: '+', value: 10 },
        { asset: 'money', op: '-', value: 30 },
        { asset: 'money', op: '*', value: 2 },
      ],
      s,
      r,
    );
    expect(s.stats['com.t.core.happiness']).toBe(60);
    expect(s.assets['money']).toBe(140);
  });

  it('clamps stats to their declared range', () => {
    const r = registryWith();
    const s = freshState();
    applyEffects([{ stat: 'com.t.core.happiness', op: '+', value: 999 }], s, r);
    expect(s.stats['com.t.core.happiness']).toBe(100);
    applyEffects([{ stat: 'com.t.core.happiness', op: '-', value: 999 }], s, r);
    expect(s.stats['com.t.core.happiness']).toBe(0);
  });
});

describe('flag effects', () => {
  it('set assigns any value', () => {
    const s = freshState();
    applyEffects([{ flag: 'criminal_record', op: 'set', value: true }], s, registryWith());
    expect(s.flags['criminal_record']).toBe(true);
  });
  it('push and remove manage a list flag', () => {
    const r = registryWith();
    const s = freshState();
    applyEffects(
      [
        { flag: 'tags', op: 'push', value: 'a' } as Effect,
        { flag: 'tags', op: 'push', value: 'b' } as Effect,
      ],
      s,
      r,
    );
    expect(s.flags['tags']).toEqual(['a', 'b']);
    applyEffects([{ flag: 'tags', op: 'remove', value: 'a' } as Effect], s, r);
    expect(s.flags['tags']).toEqual(['b']);
  });
});

describe('triggerEvent', () => {
  it('is returned for the turn loop to queue', () => {
    const triggered = applyEffects([{ triggerEvent: 'evt.next' }], freshState(), registryWith());
    expect(triggered).toEqual(['evt.next']);
  });
});
