import type { Effect } from '@fateline/mod-schema';
import type { GameState, FlagValue } from './state.js';
import type { Registry } from './registry.js';
import { getStat, getAsset, setStatClamped } from './accessors.js';

/**
 * Effect resolver — README §5.3. Mutates `state` in place. Returns the list of
 * follow-up event ids requested via `triggerEvent`, for the turn loop to queue.
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

/** Apply one effect; returns a triggered event id if the effect is a trigger. */
function applyEffect(effect: Effect, state: GameState, registry: Registry): string | undefined {
  if ('stat' in effect) {
    const next = applyNumeric(getStat(state, effect.stat), effect.op, effect.value);
    setStatClamped(state, registry, effect.stat, next);
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
 * the order they were requested.
 */
export function applyEffects(
  effects: readonly Effect[],
  state: GameState,
  registry: Registry,
): string[] {
  const triggered: string[] = [];
  for (const effect of effects) {
    const id = applyEffect(effect, state, registry);
    if (id !== undefined) triggered.push(id);
  }
  return triggered;
}
