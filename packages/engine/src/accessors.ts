import type { GameState } from './state.js';
import { AGE_STAT_ID } from './state.js';
import type { Registry } from './registry.js';

/**
 * Shared read/write helpers over GameState. Centralizes the rules that both
 * the condition evaluator and effect resolver must agree on — notably the
 * reserved `age` stat and per-stat clamping (README §4.4).
 */

/** Resolve a stat read. The reserved id `age` comes from the character. */
export function getStat(state: GameState, statId: string): number {
  if (statId === AGE_STAT_ID) return state.character.age;
  return state.stats[statId] ?? 0;
}

export function getAsset(state: GameState, assetId: string): number {
  return state.assets[assetId] ?? 0;
}

/**
 * Write a stat, clamping to its declared [min, max] range. Unknown stats (no
 * declaration) are stored unclamped — but the engine only writes stats that
 * exist in the registry, so in practice every write is clamped.
 */
export function setStatClamped(
  state: GameState,
  registry: Registry,
  statId: string,
  value: number,
): void {
  const def = registry.stats.get(statId);
  if (def) {
    state.stats[statId] = Math.min(def.max, Math.max(def.min, value));
  } else {
    state.stats[statId] = value;
  }
}
