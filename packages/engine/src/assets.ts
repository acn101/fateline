import type { AssetType, Ribbon } from '@fateline/mod-schema';
import type { GameState } from './state.js';
import type { Registry } from './registry.js';
import { evaluateAll } from './conditions.js';
import { getAsset } from './accessors.js';

/**
 * Asset interpreter & ribbon selection — README §4.5.4–5. Owned assets pay
 * upkeep and re-value each age-up; the end-of-life ribbon is the
 * highest-priority one whose conditions match the final state.
 */

const MONEY = 'money';

export type BuyError = 'no-asset' | 'unaffordable' | 'conditions' | 'dead';

/** Asset types the player can currently buy (conditions pass, affordable). */
export function availableAssets(state: GameState, registry: Registry): AssetType[] {
  if (!state.character.alive) return [];
  return [...registry.assetTypes.values()].filter(
    (a) => getAsset(state, MONEY) >= a.price && evaluateAll(a.conditions, state, state.rng),
  );
}

/** Buy an asset: debit its price, add an owned instance at full value. */
export function buyAsset(
  state: GameState,
  registry: Registry,
  assetTypeId: string,
): BuyError | null {
  if (!state.character.alive) return 'dead';
  const type = registry.assetTypes.get(assetTypeId);
  if (!type) return 'no-asset';
  if (getAsset(state, MONEY) < type.price) return 'unaffordable';
  if (!evaluateAll(type.conditions, state, state.rng)) return 'conditions';
  state.assets[MONEY] = getAsset(state, MONEY) - type.price;
  state.ownedAssets.push({ id: `asset.${state.nextAssetId++}`, assetTypeId, value: type.price });
  state.history.push({ age: state.character.age, text: `You bought a ${type.label}.` });
  return null;
}

/** Sell an owned asset: credit its current value, remove the instance. */
export function sellAsset(state: GameState, ownedId: string): boolean {
  const idx = state.ownedAssets.findIndex((a) => a.id === ownedId);
  if (idx === -1) return false;
  const owned = state.ownedAssets[idx]!;
  state.assets[MONEY] = getAsset(state, MONEY) + owned.value;
  state.ownedAssets.splice(idx, 1);
  state.history.push({ age: state.character.age, text: 'You sold an asset.' });
  return true;
}

/** Per-age-up: pay upkeep and apply appreciation/depreciation to owned assets. */
export function advanceAssets(state: GameState, registry: Registry): void {
  for (const owned of state.ownedAssets) {
    const type = registry.assetTypes.get(owned.assetTypeId);
    if (!type) continue;
    if (type.yearlyUpkeep > 0) state.assets[MONEY] = getAsset(state, MONEY) - type.yearlyUpkeep;
    if (type.yearlyValueChange !== 0) {
      owned.value = Math.max(0, Math.round(owned.value * (1 + type.yearlyValueChange)));
    }
  }
}

/**
 * Choose the end-of-life ribbon: the highest-priority ribbon whose conditions
 * match the final state. Ties broken by load order (first wins).
 */
export function selectRibbon(state: GameState, registry: Registry): Ribbon | undefined {
  let best: Ribbon | undefined;
  for (const ribbon of registry.ribbons) {
    if (!evaluateAll(ribbon.conditions, state, state.rng)) continue;
    if (!best || ribbon.priority > best.priority) best = ribbon;
  }
  return best;
}
