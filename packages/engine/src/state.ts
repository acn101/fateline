import type { RngState } from './rng.js';

/**
 * Canonical, serializable game state — README §4.1. This object IS the save
 * file: JSON-serializable, fully reconstructable, deterministic given its
 * `rng`. No methods, no class instances — pure data.
 */

export type FlagValue = boolean | number | string | Array<boolean | number | string>;

/** Player/NPC gender. `x` = nonbinary/unspecified. */
export type Gender = 'male' | 'female' | 'x';

export interface Character {
  id: string;
  name: string;
  gender: Gender;
  /** Ethnicity id from a demographics pack (e.g. `eth.east-asian`), or ''. */
  ethnicity: string;
  /** Country id (e.g. `country.us`), or ''. */
  country: string;
  /** Birthplace city name, or ''. */
  birthplace: string;
  age: number;
  alive: boolean;
  birthYear: number;
}

/** A single stat/asset change shown as feedback on a history entry. */
export interface Delta {
  /** Display label, e.g. "Happiness" or "$". */
  label: string;
  /** Signed change amount. */
  amount: number;
}

/** One entry in the scrollable life story (README §4.1). */
export interface HistoryEntry {
  age: number;
  /** Event title or system message shown for this entry. */
  text: string;
  /** Result text of the chosen outcome, if this entry came from an event. */
  resultText?: string;
  /** Stat/asset changes this outcome caused — the visible cause→effect feedback. */
  deltas?: Delta[];
}

/** The player's current job (README §4.5.3). */
export interface CareerState {
  careerId: string;
  /** Index into the career's `levels` ladder. */
  level: number;
  yearsInLevel: number;
}

/** The player's current education enrollment (README §4.5.3). */
export interface EducationState {
  programId: string;
  yearsCompleted: number;
}

/** An owned asset instance with its current (possibly appreciated) value. */
export interface OwnedAsset {
  id: string;
  assetTypeId: string;
  value: number;
}

/** A persistent NPC the player has a relationship with (README §4.5.2). */
export interface Relationship {
  /** Unique instance id within this save. */
  id: string;
  name: string;
  gender: Gender;
  /** Relationship category, e.g. `friend`, `partner`, `parent`. */
  type: string;
  alive: boolean;
  /** Per-relationship stats, e.g. { relationship: 0-100 }. */
  stats: Record<string, number>;
  flags: Record<string, FlagValue>;
}

export interface GameState {
  character: Character;
  /** Stat values keyed by resolved (namespaced/exposed) stat id. */
  stats: Record<string, number>;
  /** Free-form variable bag (README §4.4 tier 1). */
  flags: Record<string, FlagValue>;
  /** Asset balances keyed by id (e.g. `money`). */
  assets: Record<string, number>;
  /** Persistent NPCs (README §4.5.2). */
  relationships: Relationship[];
  /** Monotonic counter for generating unique relationship instance ids. */
  nextRelationshipId: number;
  /** Current job, or null if unemployed (README §4.5.3). */
  career: CareerState | null;
  /** Current education enrollment, or null (README §4.5.3). */
  education: EducationState | null;
  /** Owned asset instances with current value (README §4.5.4). */
  ownedAssets: OwnedAsset[];
  /** Monotonic counter for unique owned-asset instance ids. */
  nextAssetId: number;
  /** End-of-life ribbon awarded at death, or null while alive (README §4.5.5). */
  ribbon: { id: string; label: string } | null;
  history: HistoryEntry[];
  rng: RngState;
  /** Per-event bookkeeping for cooldowns / once-only selection. */
  eventMemory: Record<string, { lastFiredAge: number; fireCount: number }>;
  /** Per-year action usage counts (action id -> times taken this year). Reset each age-up (§4.5.1). */
  actionMemory: Record<string, number>;
  /** Modules this save depends on, id -> version. */
  installedMods: Record<string, string>;
}

/** Reserved stat id that resolves from `character.age` rather than `stats`. */
export const AGE_STAT_ID = 'age';
