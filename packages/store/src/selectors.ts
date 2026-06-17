import { availableActions, type Registry, type GameState } from '@fateline/engine';
import type { GameAction } from '@fateline/mod-schema';

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
