import type { Condition, LeafCondition, ComparisonOp } from '@fateline/module-schema';
import type { GameState } from './state.js';
import { getStat, getAsset } from './accessors.js';
import { nextFloat, type RngState } from './rng.js';

/**
 * Condition evaluator — README §5.3. Pure given (state, rng). `random` leaves
 * consume RNG, so evaluation order is deterministic and the caller threads one
 * RNG through a whole turn.
 */

type ConditionValue = LeafCondition['value'];

function compare(op: ComparisonOp, left: unknown, right: ConditionValue): boolean {
  switch (op) {
    case '==':
      return left === right;
    case '!=':
      return left !== right;
    case '>':
      return Number(left) > Number(right);
    case '>=':
      return Number(left) >= Number(right);
    case '<':
      return Number(left) < Number(right);
    case '<=':
      return Number(left) <= Number(right);
    case 'in':
      return Array.isArray(right) && (right as unknown[]).includes(left);
  }
}

function evalLeaf(leaf: LeafCondition, state: GameState, rng: RngState): boolean {
  if ('stat' in leaf) return compare(leaf.op, getStat(state, leaf.stat), leaf.value);
  if ('asset' in leaf) return compare(leaf.op, getAsset(state, leaf.asset), leaf.value);
  if ('flag' in leaf) return compare(leaf.op, state.flags[leaf.flag] ?? false, leaf.value);
  // random: draw once and compare against the threshold value.
  return compare(leaf.op, nextFloat(rng), leaf.value);
}

/** Evaluate one condition (leaf or group) against state. */
export function evaluateCondition(cond: Condition, state: GameState, rng: RngState): boolean {
  if ('all' in cond) return cond.all.every((c) => evaluateCondition(c, state, rng));
  if ('any' in cond) return cond.any.some((c) => evaluateCondition(c, state, rng));
  return evalLeaf(cond, state, rng);
}

/** A bare list of conditions is implicit AND (README §5.3). */
export function evaluateAll(
  conditions: readonly Condition[],
  state: GameState,
  rng: RngState,
): boolean {
  return conditions.every((c) => evaluateCondition(c, state, rng));
}
