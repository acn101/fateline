import type { FatelineMod, GameEvent, StatDefinition } from '@fateline/mod-schema';

/**
 * Compiled content registry — the engine's read-only view of all enabled
 * modules merged in load order (README §5.5). Stat ids are resolved here
 * (namespaced by module, or shared via `exposeAs`, per §4.4) so the rest of
 * the engine works with already-resolved ids.
 */

export interface ResolvedStat extends StatDefinition {
  /** The id used everywhere in game state (exposeAs, else `${moduleId}.${id}`). */
  resolvedId: string;
}

export interface Registry {
  /** Resolved stats keyed by resolvedId, in load order. */
  stats: Map<string, ResolvedStat>;
  /** All events keyed by their (module-namespaced) id. */
  events: Map<string, GameEvent>;
  /**
   * Resolved id of the "vitality" stat: when it reaches its minimum, the
   * character dies. Set from compile options so death is configurable rather
   * than a hardcoded `health` key (keeps §4.4 "no hardcoded stats" honest).
   */
  vitalityStatId: string | undefined;
}

export interface CompileOptions {
  /**
   * Which stat governs death, as `${moduleId}.${localId}` or an exposed id.
   * Defaults to an exposed/declared stat named `health` if present.
   */
  vitalityStatId?: string;
}

/** Namespace a local id under its module, e.g. `medieval` + `karma`. */
export function namespaceId(moduleId: string, localId: string): string {
  return `${moduleId}.${localId}`;
}

/**
 * Build a registry from enabled modules in load order. Later modules override
 * earlier ones on id collision (README §5.5).
 */
export function compileRegistry(
  modules: readonly FatelineMod[],
  options: CompileOptions = {},
): Registry {
  const stats = new Map<string, ResolvedStat>();
  const events = new Map<string, GameEvent>();

  for (const mod of modules) {
    const moduleId = mod.manifest.id;
    for (const stat of mod.content.stats) {
      const resolvedId = stat.exposeAs ?? namespaceId(moduleId, stat.id);
      stats.set(resolvedId, { ...stat, resolvedId });
    }
    for (const event of mod.content.events) {
      events.set(event.id, event);
    }
  }

  const vitalityStatId =
    options.vitalityStatId ??
    [...stats.values()].find((s) => s.exposeAs === 'health' || s.id === 'health')?.resolvedId;

  return { stats, events, vitalityStatId };
}

/** Initial stat values from declared defaults, keyed by resolvedId. */
export function initialStats(registry: Registry): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, def] of registry.stats) out[id] = def.default;
  return out;
}
