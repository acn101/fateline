import type { GameAction } from '@fateline/mod-schema';
import type { GameState } from './state.js';
import type { Registry } from './registry.js';
import { weightedPick } from './rng.js';
import { evaluateAll } from './conditions.js';
import { applyEffects } from './effects.js';
import { getAsset } from './accessors.js';
import { resolveTriggers, checkDeath } from './turn.js';

/**
 * Action interpreter — README §4.5.1. Actions are player-pulled (the Activities
 * menu), repeatable within a year subject to cost and per-year limits. They
 * reuse the weighted-outcome resolution and trigger chaining used by events.
 */

/** Has the per-year limit for this action been reached? */
function limitReached(action: GameAction, state: GameState): boolean {
  if (action.perYearLimit === undefined) return false;
  return (state.actionMemory[action.id] ?? 0) >= action.perYearLimit;
}

/** Can the player currently afford this action's cost? */
export function canAfford(action: GameAction, state: GameState): boolean {
  if (!action.cost) return true;
  return Object.entries(action.cost).every(([asset, amount]) => getAsset(state, asset) >= amount);
}

/**
 * The actions the player may take right now: conditions pass, the per-year
 * limit is not hit, and the cost is affordable. This is the Activities menu.
 */
export function availableActions(state: GameState, registry: Registry): GameAction[] {
  if (!state.character.alive) return [];
  const out: GameAction[] = [];
  for (const action of registry.actions.values()) {
    if (limitReached(action, state)) continue;
    if (!canAfford(action, state)) continue;
    // A throwaway RNG branch isn't needed for menu eligibility; pass state.rng
    // so `random` conditions still resolve deterministically if used.
    if (!evaluateAll(action.conditions, state, state.rng)) continue;
    out.push(action);
  }
  return out;
}

/** Why a takeAction call was rejected, or null if it succeeded. */
export type TakeActionError = 'not-found' | 'unavailable' | 'dead';

/**
 * Take an action: debit its cost, resolve a weighted outcome, apply effects,
 * record usage + history, and resolve any triggered follow-up events. Returns
 * null on success or an error code if the action could not be taken.
 */
export function takeAction(
  state: GameState,
  registry: Registry,
  actionId: string,
): TakeActionError | null {
  if (!state.character.alive) return 'dead';
  const action = registry.actions.get(actionId);
  if (!action) return 'not-found';
  if (limitReached(action, state) || !canAfford(action, state)) return 'unavailable';
  if (!evaluateAll(action.conditions, state, state.rng)) return 'unavailable';

  // Debit cost.
  if (action.cost) {
    for (const [asset, amount] of Object.entries(action.cost)) {
      state.assets[asset] = getAsset(state, asset) - amount;
    }
  }

  const outcome =
    action.outcomes[
      weightedPick(
        state.rng,
        action.outcomes.map((o) => o.weight),
      )
    ]!;

  state.actionMemory[action.id] = (state.actionMemory[action.id] ?? 0) + 1;
  state.history.push({
    age: state.character.age,
    text: action.label,
    resultText: outcome.resultText,
  });

  resolveTriggers(state, registry, applyEffects(outcome.effects, state, registry));
  checkDeath(state, registry);
  return null;
}
