import { describe, expect, it } from 'vitest';
import type { GameState } from '@fateline/engine';
import { createMemoryBackend } from './storage.js';
import { SaveManager, migrate, migrations, CURRENT_SAVE_VERSION } from './saves.js';

function sampleState(name = 'Alex', age = 25): GameState {
  return {
    character: { id: 'pc', name, gender: 'x', age, alive: true, birthYear: 2000 },
    stats: { health: 80 },
    flags: {},
    assets: { money: 100 },
    history: [{ age, text: 'Born' }],
    rng: { seed: 12345 },
    eventMemory: {},
    actionMemory: {},
    installedMods: { 'com.fateline.core': '0.1.0' },
  };
}

describe('SaveManager', () => {
  it('saves, loads, lists, and removes', async () => {
    const mgr = new SaveManager(createMemoryBackend());
    await mgr.save('slot1', sampleState('Alex', 30));
    await mgr.save('slot2', sampleState('Bo', 40));

    const loaded = await mgr.load('slot1');
    expect(loaded?.character.name).toBe('Alex');
    expect(loaded?.character.age).toBe(30);

    const slots = await mgr.list();
    expect(slots.map((s) => s.id).sort()).toEqual(['slot1', 'slot2']);
    expect(slots.find((s) => s.id === 'slot2')?.name).toBe('Bo');

    await mgr.remove('slot1');
    expect(await mgr.load('slot1')).toBeNull();
    expect((await mgr.list()).map((s) => s.id)).toEqual(['slot2']);
  });

  it('returns null for a missing save', async () => {
    const mgr = new SaveManager(createMemoryBackend());
    expect(await mgr.load('nope')).toBeNull();
  });

  it('writes the current version envelope', async () => {
    const backend = createMemoryBackend();
    const mgr = new SaveManager(backend);
    await mgr.save('s', sampleState());
    const raw = JSON.parse((await backend.getItem('fateline/save/s'))!);
    expect(raw.version).toBe(CURRENT_SAVE_VERSION);
    expect(typeof raw.savedAt).toBe('string');
  });
});

describe('migrate', () => {
  it('passes through a current-version envelope unchanged', () => {
    const env = { version: CURRENT_SAVE_VERSION, savedAt: 'now', state: sampleState() };
    expect(migrate({ ...env }).version).toBe(CURRENT_SAVE_VERSION);
  });

  it('runs a registered migration chain', () => {
    // Temporarily register a v0 -> v1 migration to exercise the chain.
    migrations[0] = (raw) => ({ ...raw, migrated: true });
    try {
      const result = migrate({ version: 0, state: sampleState() });
      expect(result.version).toBe(CURRENT_SAVE_VERSION);
      expect(result.migrated).toBe(true);
    } finally {
      delete migrations[0];
    }
  });

  it('throws when no migration path exists', () => {
    expect(() => migrate({ version: 0, state: sampleState() })).toThrow(/No migration/);
  });

  it('treats a missing version field as version 0', () => {
    // No `version` key -> defaults to 0 -> needs a migration to reach current.
    migrations[0] = (raw) => ({ ...raw });
    try {
      expect(migrate({ state: sampleState() }).version).toBe(CURRENT_SAVE_VERSION);
    } finally {
      delete migrations[0];
    }
  });
});
