import {
  availableActions,
  relationshipActions,
  availableCareers,
  availablePrograms,
  availableAssets,
  type Registry,
  type GameState,
  type Relationship,
  type OwnedAsset,
} from '@fateline/engine';
import type {
  GameAction,
  RelationshipAction,
  Career,
  EducationProgram,
  AssetType,
} from '@fateline/mod-schema';

/** A stat ready for display: declared metadata joined with its current value. */
export interface DisplayStat {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
}

/**
 * Build the list of stats to render in the UI (README §7 — dynamic stat
 * rendering). Driven entirely by declarations: any module's `showInUI` stat
 * appears automatically, with no hardcoded stat list in the UI.
 */
export function visibleStats(registry: Registry, game: GameState): DisplayStat[] {
  const out: DisplayStat[] = [];
  for (const def of registry.stats.values()) {
    if (!def.showInUI) continue;
    out.push({
      id: def.resolvedId,
      label: def.label,
      value: game.stats[def.resolvedId] ?? def.default,
      min: def.min,
      max: def.max,
    });
  }
  return out;
}

/** An action ready for display, grouped by category. */
export interface ActionGroup {
  category: string;
  actions: GameAction[];
}

/**
 * The Activities menu grouped by category (README §7). Driven by the engine's
 * `availableActions` so eligibility (conditions, cost, per-year limit) is the
 * single source of truth; the UI just renders what it returns.
 */
export function actionMenu(registry: Registry, game: GameState): ActionGroup[] {
  const byCategory = new Map<string, GameAction[]>();
  for (const action of availableActions(game, registry)) {
    const list = byCategory.get(action.category) ?? [];
    list.push(action);
    byCategory.set(action.category, list);
  }
  return [...byCategory.entries()].map(([category, actions]) => ({ category, actions }));
}

/** A living NPC together with the interactions currently available on them. */
export interface RelationshipView {
  npc: Relationship;
  actions: RelationshipAction[];
}

/** Living relationships and their available interactions (README §7). */
export function relationshipViews(registry: Registry, game: GameState): RelationshipView[] {
  return game.relationships
    .filter((npc) => npc.alive)
    .map((npc) => ({ npc, actions: relationshipActions(game, registry, npc.id) }));
}

/** Everything the Career/School panel needs (README §7, §4.5.3). */
export interface CareerView {
  /** Current job title + salary, or null if unemployed. */
  current: { title: string; salary: number } | null;
  /** Current schooling title + progress, or null if not enrolled. */
  enrolledIn: { title: string; yearsCompleted: number; years: number } | null;
  /** Jobs the player can apply to right now. */
  openJobs: Career[];
  /** Programs the player can enroll in right now. */
  openPrograms: EducationProgram[];
}

export function careerView(registry: Registry, game: GameState): CareerView {
  let current: CareerView['current'] = null;
  if (game.career) {
    const career = registry.careers.get(game.career.careerId);
    const level = career?.levels[game.career.level];
    if (career && level) current = { title: level.title, salary: level.salary };
  }
  let enrolledIn: CareerView['enrolledIn'] = null;
  if (game.education) {
    const program = registry.education.get(game.education.programId);
    if (program) {
      enrolledIn = {
        title: program.title,
        yearsCompleted: game.education.yearsCompleted,
        years: program.years,
      };
    }
  }
  return {
    current,
    enrolledIn,
    openJobs: availableCareers(game, registry),
    openPrograms: availablePrograms(game, registry),
  };
}

/** An owned asset joined with its type's label, for display. */
export interface OwnedAssetView {
  owned: OwnedAsset;
  label: string;
}

export interface AssetsView {
  owned: OwnedAssetView[];
  buyable: AssetType[];
}

/** Owned assets + assets the player can currently buy (README §7, §4.5.4). */
export function assetsView(registry: Registry, game: GameState): AssetsView {
  return {
    owned: game.ownedAssets.map((owned) => ({
      owned,
      label: registry.assetTypes.get(owned.assetTypeId)?.label ?? owned.assetTypeId,
    })),
    buyable: availableAssets(game, registry),
  };
}
