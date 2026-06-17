import type { GameEvent } from '@fateline/mod-schema';
import type { GameState, Character } from './state.js';
import { createRng, weightedPick, type RngState } from './rng.js';
import type { Registry } from './registry.js';
import { initialStats } from './registry.js';
import { evaluateAll } from './conditions.js';
import { applyEffects } from './effects.js';
import { setStatClamped } from './accessors.js';
import { advanceCareerAndEducation } from './careers.js';

/**
 * Turn loop — README §4.2. The engine is a pure state machine: `ageUp`
 * advances a year and may surface an event; the caller picks a choice and
 * calls `applyChoice`. All randomness flows through `state.rng` (§4.3).
 */

export interface NewGameOptions {
  seed: number | string;
  character: Pick<Character, 'name' | 'gender'> & { birthYear: number };
  /** Asset starting balances, e.g. { money: 0 }. */
  assets?: Record<string, number>;
}

export function createGame(registry: Registry, options: NewGameOptions): GameState {
  return {
    character: {
      id: 'pc',
      name: options.character.name,
      gender: options.character.gender,
      age: 0,
      alive: true,
      birthYear: options.character.birthYear,
    },
    stats: initialStats(registry),
    flags: {},
    assets: { ...options.assets },
    relationships: [],
    nextRelationshipId: 0,
    career: null,
    education: null,
    history: [],
    rng: createRng(options.seed),
    eventMemory: {},
    actionMemory: {},
    installedMods: {},
  };
}

/** An event surfaced to the player, awaiting a choice. */
export interface PendingEvent {
  event: GameEvent;
}

function isEligible(event: GameEvent, state: GameState, rng: RngState): boolean {
  const mem = state.eventMemory[event.id];
  if (event.once && mem && mem.fireCount > 0) return false;
  if (
    mem &&
    event.cooldownYears > 0 &&
    state.character.age - mem.lastFiredAge < event.cooldownYears
  ) {
    return false;
  }
  return evaluateAll(event.conditions, state, rng);
}

/**
 * Advance one year: apply passive stat decay, then collect and weight-select
 * an eligible event. Returns the pending event (or null if none fired). Death
 * is checked after decay and again after each applied choice.
 */
export function ageUp(state: GameState, registry: Registry): PendingEvent | null {
  if (!state.character.alive) return null;

  state.character.age += 1;
  // A new year resets per-year action allowances (§4.5.1).
  state.actionMemory = {};

  // Passive yearly drift from declared stats (README §4.4).
  for (const def of registry.stats.values()) {
    if (def.yearlyDelta !== 0) {
      setStatClamped(
        state,
        registry,
        def.resolvedId,
        state.stats[def.resolvedId]! + def.yearlyDelta,
      );
    }
  }

  if (checkDeath(state, registry)) return null;

  // Job income/promotion and schooling progress for the year (§4.5.3).
  advanceCareerAndEducation(state, registry);

  const eligible: GameEvent[] = [];
  for (const event of registry.events.values()) {
    if (isEligible(event, state, state.rng)) eligible.push(event);
  }
  if (eligible.length === 0) return null;

  const chosen =
    eligible[
      weightedPick(
        state.rng,
        eligible.map((e) => e.weight),
      )
    ]!;
  return { event: chosen };
}

/**
 * Apply the player's choice to a pending event: pick a weighted outcome, apply
 * its effects, record history and event memory, then resolve any triggered
 * follow-up events recursively (cycle-free by validation, README §5.4).
 */
export function applyChoice(
  state: GameState,
  registry: Registry,
  pending: PendingEvent,
  choiceIndex: number,
): void {
  const choice = pending.event.choices[choiceIndex];
  if (!choice) throw new RangeError(`Invalid choice index ${choiceIndex}.`);

  const outcome =
    choice.outcomes[
      weightedPick(
        state.rng,
        choice.outcomes.map((o) => o.weight),
      )
    ]!;

  recordFired(state, pending.event.id);
  state.history.push({
    age: state.character.age,
    text: pending.event.title,
    resultText: outcome.resultText,
  });

  const queue = applyEffects(outcome.effects, state, registry);
  resolveTriggers(state, registry, queue);

  checkDeath(state, registry);
}

/** Fire chained events with no further player choice (first choice auto-taken). */
export function resolveTriggers(state: GameState, registry: Registry, queue: string[]): void {
  while (queue.length > 0) {
    const id = queue.shift()!;
    const event = registry.events.get(id);
    if (!event) continue;
    const choice = event.choices[0]!;
    const outcome =
      choice.outcomes[
        weightedPick(
          state.rng,
          choice.outcomes.map((o) => o.weight),
        )
      ]!;
    recordFired(state, event.id);
    state.history.push({
      age: state.character.age,
      text: event.title,
      resultText: outcome.resultText,
    });
    queue.push(...applyEffects(outcome.effects, state, registry));
  }
}

function recordFired(state: GameState, eventId: string): void {
  const mem = state.eventMemory[eventId] ?? { lastFiredAge: state.character.age, fireCount: 0 };
  mem.lastFiredAge = state.character.age;
  mem.fireCount += 1;
  state.eventMemory[eventId] = mem;
}

/**
 * Death check: when the registry's vitality stat reaches its declared minimum,
 * the character dies. No stat id is hardcoded (README §4.4). Returns true if
 * the character died this call.
 */
export function checkDeath(state: GameState, registry: Registry): boolean {
  if (!state.character.alive) return false;
  const vital = registry.vitalityStatId;
  if (vital === undefined) return false;
  const def = registry.stats.get(vital);
  const value = state.stats[vital];
  if (def && value !== undefined && value <= def.min) {
    state.character.alive = false;
    state.history.push({ age: state.character.age, text: 'You died.' });
    return true;
  }
  return false;
}
