import type { Registry, GameState } from '@fateline/engine';

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
