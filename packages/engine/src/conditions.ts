import type { Condition, LeafCondition, ComparisonOp } from '@fateline/mod-schema';
import type { GameState, Relationship } from './state.js';
import { getStat, getAsset } from './accessors.js';
import { nextFloat, type RngState } from './rng.js';

/**
 * Condition evaluator — README §5.3. Pure given (state, rng). `random` leaves
 * consume RNG. An optional `relTarget` supplies the NPC that `rel.*` leaves
 * resolve against, used by relationship-actions (§4.5.2).
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

function evalLeaf(
  leaf: LeafCondition,
  state: GameState,
  rng: RngState,
  relTarget: Relationship | undefined,
): boolean {
  if ('stat' in leaf) return compare(leaf.op, getStat(state, leaf.stat), leaf.value);
  if ('asset' in leaf) return compare(leaf.op, getAsset(state, leaf.asset), leaf.value);
  if ('flag' in leaf) return compare(leaf.op, state.flags[leaf.flag] ?? false, leaf.value);
  // Relationship-scoped leaves resolve against the targeted NPC; with no
  // target they are vacuously false (the action simply isn't applicable).
  if ('rel.stat' in leaf) {
    return relTarget ? compare(leaf.op, relTarget.stats[leaf['rel.stat']] ?? 0, leaf.value) : false;
  }
  if ('rel.flag' in leaf) {
    return relTarget
      ? compare(leaf.op, relTarget.flags[leaf['rel.flag']] ?? false, leaf.value)
      : false;
  }
  if ('rel.type' in leaf) {
    return relTarget ? compare(leaf.op, relTarget.type, leaf.value) : false;
  }
  // random: draw once and compare against the threshold value.
  return compare(leaf.op, nextFloat(rng), leaf.value);
}

/** Evaluate one condition (leaf or group) against state and optional NPC. */
export function evaluateCondition(
  cond: Condition,
  state: GameState,
  rng: RngState,
  relTarget?: Relationship,
): boolean {
  if ('all' in cond) return cond.all.every((c) => evaluateCondition(c, state, rng, relTarget));
  if ('any' in cond) return cond.any.some((c) => evaluateCondition(c, state, rng, relTarget));
  return evalLeaf(cond, state, rng, relTarget);
}

/** A bare list of conditions is implicit AND (README §5.3). */
export function evaluateAll(
  conditions: readonly Condition[],
  state: GameState,
  rng: RngState,
  relTarget?: Relationship,
): boolean {
  return conditions.every((c) => evaluateCondition(c, state, rng, relTarget));
}
