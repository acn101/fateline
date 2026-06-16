import type { RngState } from './rng.js';

/**
 * Canonical, serializable game state — README §4.1. This object IS the save
 * file: JSON-serializable, fully reconstructable, deterministic given its
 * `rng`. No methods, no class instances — pure data.
 */

export type FlagValue = boolean | number | string | Array<boolean | number | string>;

export interface Character {
  id: string;
  name: string;
  gender: string;
  age: number;
  alive: boolean;
  birthYear: number;
}

/** One entry in the scrollable life story (README §4.1). */
export interface HistoryEntry {
  age: number;
  /** Event title or system message shown for this entry. */
  text: string;
  /** Result text of the chosen outcome, if this entry came from an event. */
  resultText?: string;
}

export interface GameState {
  character: Character;
  /** Stat values keyed by resolved (namespaced/exposed) stat id. */
  stats: Record<string, number>;
  /** Free-form variable bag (README §4.4 tier 1). */
  flags: Record<string, FlagValue>;
  /** Asset balances keyed by id (e.g. `money`). */
  assets: Record<string, number>;
  history: HistoryEntry[];
  rng: RngState;
  /** Per-event bookkeeping for cooldowns / once-only selection. */
  eventMemory: Record<string, { lastFiredAge: number; fireCount: number }>;
  /** Modules this save depends on, id -> version. */
  installedMods: Record<string, string>;
}

/** Reserved stat id that resolves from `character.age` rather than `stats`. */
export const AGE_STAT_ID = 'age';
