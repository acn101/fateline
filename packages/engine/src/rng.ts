/**
 * Seeded, serializable pseudo-random number generator — README §4.3.
 *
 * The entire simulation draws randomness from one of these, and its state
 * lives in the save file. Same seed + same choices => same life. This is what
 * makes golden-life tests and reproducible bug reports possible (README §11.1).
 *
 * Algorithm: mulberry32 — tiny, fast, good enough distribution for a game,
 * and trivially serializable (a single uint32 of state).
 */

/** Serializable RNG state: a single 32-bit unsigned integer. */
export interface RngState {
  seed: number;
}

/** Hash an arbitrary string seed into a uint32 (so saves can use text seeds). */
export function seedFromString(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function createRng(seed: number | string): RngState {
  const numeric = typeof seed === 'string' ? seedFromString(seed) : seed >>> 0;
  return { seed: numeric };
}

/**
 * Advance `state` in place and return a float in [0, 1).
 * Mutates `state.seed`, so callers thread the same object through a turn.
 */
export function nextFloat(state: RngState): number {
  state.seed = (state.seed + 0x6d2b79f5) >>> 0;
  let t = state.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [min, max] inclusive. */
export function nextInt(state: RngState, min: number, max: number): number {
  if (min > max) throw new RangeError(`nextInt: min (${min}) > max (${max})`);
  return min + Math.floor(nextFloat(state) * (max - min + 1));
}

/**
 * Weighted pick. `weights` must be non-negative and sum to > 0.
 * Returns the chosen index.
 */
export function weightedPick(state: RngState, weights: readonly number[]): number {
  let total = 0;
  for (const w of weights) {
    if (w < 0) throw new RangeError('weightedPick: weights must be non-negative.');
    total += w;
  }
  if (total <= 0) throw new RangeError('weightedPick: weights must sum to a positive value.');

  let roll = nextFloat(state) * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i]!;
    if (roll < 0) return i;
  }
  return weights.length - 1; // floating-point guard
}
