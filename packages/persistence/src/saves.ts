import type { GameState } from '@fateline/engine';
import type { StorageBackend } from './storage.js';

/**
 * Save/load with a versioned envelope and a forward-migration chain (README
 * §9 Phase 7). Every save records the schema version it was written with; on
 * load, migrations run in sequence until the save reaches CURRENT_VERSION.
 */

export const CURRENT_SAVE_VERSION = 1;
const SAVE_PREFIX = 'fateline/save/';

export interface SaveEnvelope {
  version: number;
  savedAt: string;
  state: GameState;
}

export interface SaveSlot {
  id: string;
  name: string;
  age: number;
  alive: boolean;
  savedAt: string;
}

/** A migration upgrades a raw envelope from one version to the next. */
export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * Ordered migrations keyed by the version they upgrade FROM. Empty today
 * (we are at v1); when the GameState shape changes, add `1: (raw) => {...}`.
 */
export const migrations: Record<number, Migration> = {};

export class SaveManager {
  constructor(private readonly backend: StorageBackend) {}

  async save(id: string, state: GameState): Promise<void> {
    const envelope: SaveEnvelope = {
      version: CURRENT_SAVE_VERSION,
      savedAt: new Date().toISOString(),
      state,
    };
    await this.backend.setItem(SAVE_PREFIX + id, JSON.stringify(envelope));
  }

  async load(id: string): Promise<GameState | null> {
    const raw = await this.backend.getItem(SAVE_PREFIX + id);
    if (raw === null) return null;
    const migrated = migrate(JSON.parse(raw) as Record<string, unknown>);
    return migrated.state as GameState;
  }

  async remove(id: string): Promise<void> {
    await this.backend.removeItem(SAVE_PREFIX + id);
  }

  async list(): Promise<SaveSlot[]> {
    const keys = (await this.backend.keys()).filter((k) => k.startsWith(SAVE_PREFIX));
    const slots: SaveSlot[] = [];
    for (const key of keys) {
      const raw = await this.backend.getItem(key);
      if (raw === null) continue;
      const env = migrate(JSON.parse(raw) as Record<string, unknown>);
      const state = env.state as GameState;
      slots.push({
        id: key.slice(SAVE_PREFIX.length),
        name: state.character.name,
        age: state.character.age,
        alive: state.character.alive,
        savedAt: String(env.savedAt),
      });
    }
    return slots;
  }
}

/** Run the migration chain until the envelope is at the current version. */
export function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let current = raw;
  let version = typeof current.version === 'number' ? current.version : 0;
  while (version < CURRENT_SAVE_VERSION) {
    const migration = migrations[version];
    if (!migration) {
      throw new Error(`No migration from save version ${version}; cannot load this save.`);
    }
    current = migration(current);
    version += 1;
    current.version = version;
  }
  return current;
}
