import type { Effect } from '@fateline/mod-schema';
import type { GameState, FlagValue, Relationship, Delta } from './state.js';
import type { Registry } from './registry.js';
import { getStat, getAsset, setStatClamped } from './accessors.js';
import { generateNpcName, randomGender } from './demographics.js';

/**
 * Effect resolver — README §5.3 / §4.5.2. Mutates `state` in place. Returns the
 * list of follow-up event ids requested via `triggerEvent`. An optional
 * `relTarget` is the NPC that `rel.*`, `addRelationship`, and
 * `removeRelationship` effects operate on.
 */

function applyNumeric(current: number, op: '+' | '-' | '*' | 'set', value: number): number {
  switch (op) {
    case '+':
      return current + value;
    case '-':
      return current - value;
    case '*':
      return current * value;
    case 'set':
      return value;
  }
}

/** Instantiate an NPC from a declared archetype and append it to the save. */
export function addRelationship(
  state: GameState,
  registry: Registry,
  archetypeId: string,
  name?: string,
): Relationship | undefined {
  const archetype = registry.archetypes.get(archetypeId);
  if (!archetype) return undefined;
  // Pick a gender (forced by archetype, else random) and a believable name.
  const gender = archetype.gender ?? randomGender(state.rng);
  let resolvedName = name ?? archetype.defaultName;
  if (!name && archetype.generateName) {
    const generated = generateNpcName(state.rng, registry, gender);
    if (generated !== 'Anonymous') resolvedName = generated;
  }
  const npc: Relationship = {
    id: `rel.${state.nextRelationshipId++}`,
    name: resolvedName,
    gender,
    type: archetype.type,
    alive: true,
    stats: { ...archetype.stats },
    flags: {},
  };
  state.relationships.push(npc);
  return npc;
}

/** Apply one effect; returns a triggered event id if the effect is a trigger. */
function applyEffect(
  effect: Effect,
  state: GameState,
  registry: Registry,
  relTarget: Relationship | undefined,
): string | undefined {
  if ('stat' in effect) {
    setStatClamped(
      state,
      registry,
      effect.stat,
      applyNumeric(getStat(state, effect.stat), effect.op, effect.value),
    );
    return undefined;
  }
  if ('asset' in effect) {
    state.assets[effect.asset] = applyNumeric(
      getAsset(state, effect.asset),
      effect.op,
      effect.value,
    );
    return undefined;
  }
  if ('flag' in effect) {
    applyFlagEffect(effect, state);
    return undefined;
  }
  if ('rel.stat' in effect) {
    if (relTarget) {
      const id = effect['rel.stat'];
      relTarget.stats[id] = applyNumeric(relTarget.stats[id] ?? 0, effect.op, effect.value);
    }
    return undefined;
  }
  if ('rel.flag' in effect) {
    if (relTarget) relTarget.flags[effect['rel.flag']] = effect.value;
    return undefined;
  }
  if ('addRelationship' in effect) {
    addRelationship(state, registry, effect.addRelationship, effect.name);
    return undefined;
  }
  if ('removeRelationship' in effect) {
    if (relTarget) state.relationships = state.relationships.filter((r) => r.id !== relTarget.id);
    return undefined;
  }
  return effect.triggerEvent;
}

function applyFlagEffect(effect: Extract<Effect, { flag: string }>, state: GameState): void {
  if (effect.op === 'set') {
    state.flags[effect.flag] = effect.value;
    return;
  }
  // push / remove operate on a list-valued flag.
  const existing = state.flags[effect.flag];
  const list: FlagValue[] = Array.isArray(existing) ? [...existing] : [];
  if (effect.op === 'push') {
    list.push(effect.value);
  } else {
    const idx = list.indexOf(effect.value);
    if (idx !== -1) list.splice(idx, 1);
  }
  state.flags[effect.flag] = list as FlagValue;
}

/**
 * Apply a list of effects in order. Returns triggered follow-up event ids in
 * the order they were requested. `relTarget` scopes rel.* effects to one NPC.
 */
export function applyEffects(
  effects: readonly Effect[],
  state: GameState,
  registry: Registry,
  relTarget?: Relationship,
): string[] {
  const triggered: string[] = [];
  for (const effect of effects) {
    const id = applyEffect(effect, state, registry, relTarget);
    if (id !== undefined) triggered.push(id);
  }
  return triggered;
}

/**
 * Apply effects and also compute the player-visible stat/asset deltas they
 * caused (the cause→effect feedback that makes choices feel like they matter).
 * Snapshots player stats + the `money` asset before/after; ignores rel.* and
 * other-asset changes for display brevity.
 */
export function applyOutcomeWithDeltas(
  effects: readonly Effect[],
  state: GameState,
  registry: Registry,
  relTarget?: Relationship,
): { triggered: string[]; deltas: Delta[] } {
  const beforeStats = { ...state.stats };
  const beforeMoney = getAsset(state, 'money');
  const triggered = applyEffects(effects, state, registry, relTarget);

  const deltas: Delta[] = [];
  for (const [id, def] of registry.stats) {
    const diff = (state.stats[id] ?? 0) - (beforeStats[id] ?? 0);
    if (diff !== 0) deltas.push({ label: def.label, amount: diff });
  }
  const moneyDiff = getAsset(state, 'money') - beforeMoney;
  if (moneyDiff !== 0) deltas.push({ label: '$', amount: moneyDiff });
  return { triggered, deltas };
}
