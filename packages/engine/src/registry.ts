import type {
  FatelineMod,
  GameEvent,
  GameAction,
  StatDefinition,
  Archetype,
  RelationshipAction,
  Career,
  EducationProgram,
  AssetType,
  Ribbon,
  Country,
  Ethnicity,
} from '@fateline/mod-schema';

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
  /** All actions keyed by their id, in load order (§4.5.1). */
  actions: Map<string, GameAction>;
  /** NPC archetypes keyed by id (§4.5.2). */
  archetypes: Map<string, Archetype>;
  /** Relationship-actions keyed by id (§4.5.2). */
  relationshipActions: Map<string, RelationshipAction>;
  /** Careers keyed by id (§4.5.3). */
  careers: Map<string, Career>;
  /** Education programs keyed by id (§4.5.3). */
  education: Map<string, EducationProgram>;
  /** Ownable asset types keyed by id (§4.5.4). */
  assetTypes: Map<string, AssetType>;
  /** End-of-life ribbons (§4.5.5), kept in load order. */
  ribbons: Ribbon[];
  /** Countries keyed by id (demographics). */
  countries: Map<string, Country>;
  /** Ethnicities keyed by id (demographics). */
  ethnicities: Map<string, Ethnicity>;
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
  const actions = new Map<string, GameAction>();
  const archetypes = new Map<string, Archetype>();
  const relationshipActions = new Map<string, RelationshipAction>();
  const careers = new Map<string, Career>();
  const education = new Map<string, EducationProgram>();
  const assetTypes = new Map<string, AssetType>();
  const ribbons: Ribbon[] = [];
  const countries = new Map<string, Country>();
  const ethnicities = new Map<string, Ethnicity>();

  for (const mod of modules) {
    const moduleId = mod.manifest.id;
    // Defensive `?? []`: validated mods always have these arrays, but engine
    // callers sometimes hand-build registries from partial fixtures.
    for (const stat of mod.content.stats ?? []) {
      const resolvedId = stat.exposeAs ?? namespaceId(moduleId, stat.id);
      stats.set(resolvedId, { ...stat, resolvedId });
    }
    for (const event of mod.content.events ?? []) {
      events.set(event.id, event);
    }
    for (const action of mod.content.actions ?? []) {
      actions.set(action.id, action);
    }
    for (const archetype of mod.content.archetypes ?? []) {
      archetypes.set(archetype.id, archetype);
    }
    for (const relAction of mod.content.relationshipActions ?? []) {
      relationshipActions.set(relAction.id, relAction);
    }
    for (const career of mod.content.careers ?? []) {
      careers.set(career.id, career);
    }
    for (const program of mod.content.education ?? []) {
      education.set(program.id, program);
    }
    for (const assetType of mod.content.assetTypes ?? []) {
      assetTypes.set(assetType.id, assetType);
    }
    for (const ribbon of mod.content.ribbons ?? []) {
      ribbons.push(ribbon);
    }
    for (const country of mod.content.countries ?? []) {
      countries.set(country.id, country);
    }
    for (const ethnicity of mod.content.ethnicities ?? []) {
      ethnicities.set(ethnicity.id, ethnicity);
    }
  }

  const vitalityStatId =
    options.vitalityStatId ??
    [...stats.values()].find((s) => s.exposeAs === 'health' || s.id === 'health')?.resolvedId;

  return {
    stats,
    events,
    actions,
    archetypes,
    relationshipActions,
    careers,
    education,
    assetTypes,
    ribbons,
    countries,
    ethnicities,
    vitalityStatId,
  };
}

/** Initial stat values from declared defaults, keyed by resolvedId. */
export function initialStats(registry: Registry): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, def] of registry.stats) out[id] = def.default;
  return out;
}
