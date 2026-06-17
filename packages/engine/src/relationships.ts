import type { RelationshipAction } from '@fateline/mod-schema';
import type { GameState, Relationship } from './state.js';
import type { Registry } from './registry.js';
import { weightedPick } from './rng.js';
import { evaluateAll } from './conditions.js';
import { applyEffects } from './effects.js';
import { resolveTriggers, checkDeath } from './turn.js';

/**
 * Relationship interpreter — README §4.5.2. Actions are aimed at a specific
 * NPC; their conditions/effects use the `rel.*` targets that resolve against
 * that NPC. Reuses the weighted-outcome + trigger machinery of events/actions.
 */

/** Does a relationship-action apply to (and pass conditions for) this NPC? */
function applicable(action: RelationshipAction, npc: Relationship, state: GameState): boolean {
  if (action.appliesTo.length > 0 && !action.appliesTo.includes(npc.type)) return false;
  return evaluateAll(action.conditions, state, state.rng, npc);
}

/** The relationship-actions the player may take on a given living NPC. */
export function relationshipActions(
  state: GameState,
  registry: Registry,
  npcId: string,
): RelationshipAction[] {
  const npc = state.relationships.find((r) => r.id === npcId);
  if (!npc || !npc.alive || !state.character.alive) return [];
  return [...registry.relationshipActions.values()].filter((a) => applicable(a, npc, state));
}

export type TakeRelationshipActionError = 'no-npc' | 'no-action' | 'unavailable' | 'dead';

/**
 * Take a relationship-action against an NPC: resolve a weighted outcome with
 * the NPC as the rel.* target, apply effects, record history, resolve triggers.
 */
export function takeRelationshipAction(
  state: GameState,
  registry: Registry,
  npcId: string,
  actionId: string,
): TakeRelationshipActionError | null {
  if (!state.character.alive) return 'dead';
  const npc = state.relationships.find((r) => r.id === npcId);
  if (!npc || !npc.alive) return 'no-npc';
  const action = registry.relationshipActions.get(actionId);
  if (!action) return 'no-action';
  if (!applicable(action, npc, state)) return 'unavailable';

  const outcome =
    action.outcomes[
      weightedPick(
        state.rng,
        action.outcomes.map((o) => o.weight),
      )
    ]!;

  state.history.push({
    age: state.character.age,
    text: `${action.label} — ${npc.name}`,
    resultText: outcome.resultText,
  });

  resolveTriggers(state, registry, applyEffects(outcome.effects, state, registry, npc));
  checkDeath(state, registry);
  return null;
}
