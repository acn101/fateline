import type { Registry } from './registry.js';
import { createGame, ageUp, applyChoice } from './turn.js';
import { availableActions, takeAction } from './actions.js';
import { relationshipActions, takeRelationshipAction } from './relationships.js';
import { availableCareers, applyToJob, availablePrograms, enroll } from './careers.js';

/**
 * Headless smoke test — README §11.2. Runs N seeded lives against a compiled
 * registry and asserts the engine never crashes, lives always terminate, and
 * declared stats never escape their bounds. This is the gameplay-level check
 * the `fateline-validate` CLI and the registry CI gate run on every module.
 */

export interface SmokeOptions {
  /** Number of distinct seeded lives to simulate. */
  lives?: number;
  /** Hard cap on age-ups per life; exceeding it means the life got stuck. */
  maxYears?: number;
}

export interface SmokeProblem {
  seed: number;
  kind: 'did-not-terminate' | 'stat-out-of-bounds' | 'threw';
  detail: string;
}

export interface SmokeReport {
  ok: boolean;
  livesRun: number;
  problems: SmokeProblem[];
}

export function smokeTest(registry: Registry, options: SmokeOptions = {}): SmokeReport {
  const lives = options.lives ?? 100;
  const maxYears = options.maxYears ?? 200;
  const problems: SmokeProblem[] = [];

  for (let seed = 0; seed < lives; seed++) {
    try {
      const game = createGame(registry, {
        seed,
        character: { name: 'Smoke', gender: 'x', birthYear: 2000 },
        assets: { money: 0 },
      });

      let years = 0;
      while (game.character.alive && years < maxYears) {
        const pending = ageUp(game, registry);
        if (pending) {
          // Exercise a deterministic-but-varied choice across the run.
          applyChoice(game, registry, pending, seed % pending.event.choices.length);
        }
        // Also exercise the Activities menu so actions are smoke-tested too.
        const actions = availableActions(game, registry);
        if (actions.length > 0) {
          takeAction(game, registry, actions[(seed + years) % actions.length]!.id);
        }
        // And exercise a relationship interaction with the first living NPC.
        const npc = game.relationships.find((r) => r.alive);
        if (npc) {
          const relActions = relationshipActions(game, registry, npc.id);
          if (relActions.length > 0) {
            takeRelationshipAction(
              game,
              registry,
              npc.id,
              relActions[(seed + years) % relActions.length]!.id,
            );
          }
        }
        // Exercise schooling, then a job (§4.5.3).
        if (!game.education) {
          const programs = availablePrograms(game, registry);
          if (programs.length > 0) enroll(game, registry, programs[seed % programs.length]!.id);
        }
        if (!game.career) {
          const careers = availableCareers(game, registry);
          if (careers.length > 0) applyToJob(game, registry, careers[seed % careers.length]!.id);
        }
        years += 1;
      }

      if (game.character.alive) {
        problems.push({
          seed,
          kind: 'did-not-terminate',
          detail: `life still alive after ${maxYears} years`,
        });
      }

      for (const [statId, value] of Object.entries(game.stats)) {
        const def = registry.stats.get(statId);
        if (def && (value < def.min || value > def.max)) {
          problems.push({
            seed,
            kind: 'stat-out-of-bounds',
            detail: `stat "${statId}" = ${value}, outside [${def.min}, ${def.max}]`,
          });
        }
      }
    } catch (err) {
      problems.push({
        seed,
        kind: 'threw',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { ok: problems.length === 0, livesRun: lives, problems };
}
