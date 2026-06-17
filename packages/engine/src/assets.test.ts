import { describe, expect, it } from 'vitest';
import { validateMod, type FatelineMod } from '@fateline/mod-schema';
import { compileRegistry } from './registry.js';
import { createGame, ageUp } from './turn.js';
import { buyAsset, sellAsset, availableAssets, selectRibbon } from './assets.js';

function compile(raw: unknown) {
  const r = validateMod(raw);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return compileRegistry([r.value as FatelineMod]);
}

const manifest = {
  id: 'com.test.core',
  name: 'C',
  version: '1.0.0',
  engineVersion: '*',
  author: 'a',
  description: '',
  dependencies: [],
};

function reg() {
  return compile({
    manifest,
    content: {
      stats: [{ id: 'health', label: 'H', min: 0, max: 100, default: 100, exposeAs: 'health' }],
      assetTypes: [
        {
          id: 'asset.house',
          label: 'House',
          category: 'realestate',
          price: 1000,
          yearlyUpkeep: 50,
          yearlyValueChange: 0.1,
          conditions: [],
        },
        {
          id: 'asset.jet',
          label: 'Jet',
          price: 1000000,
          conditions: [],
        },
      ],
      ribbons: [
        {
          id: 'ribbon.rich',
          label: 'Loaded',
          priority: 50,
          conditions: [{ asset: 'money', op: '>=', value: 10000 }],
        },
        { id: 'ribbon.ok', label: 'Well Lived', priority: 1, conditions: [] },
      ],
    },
  });
}

function game(r: ReturnType<typeof reg>, money = 5000) {
  return createGame(r, {
    seed: 1,
    character: { name: 'A', gender: 'x', birthYear: 2000 },
    assets: { money },
  });
}

describe('assets', () => {
  it('availableAssets filters by affordability', () => {
    const r = reg();
    const g = game(r, 5000);
    expect(availableAssets(g, r).map((a) => a.id)).toEqual(['asset.house']); // jet too expensive
  });

  it('buyAsset debits money and records an owned instance', () => {
    const r = reg();
    const g = game(r, 5000);
    expect(buyAsset(g, r, 'asset.house')).toBeNull();
    expect(g.assets['money']).toBe(4000);
    expect(g.ownedAssets).toHaveLength(1);
    expect(g.ownedAssets[0]!.value).toBe(1000);
  });

  it('rejects unaffordable / unknown / dead', () => {
    const r = reg();
    const g = game(r, 0);
    expect(buyAsset(g, r, 'asset.house')).toBe('unaffordable');
    expect(buyAsset(g, r, 'asset.nope')).toBe('no-asset');
    g.character.alive = false;
    expect(buyAsset(g, r, 'asset.house')).toBe('dead');
    expect(availableAssets(g, r)).toHaveLength(0);
  });

  it('applies upkeep and appreciation each age-up', () => {
    const r = reg();
    const g = game(r, 5000);
    buyAsset(g, r, 'asset.house'); // -1000 -> 4000, owns house @1000
    ageUp(g, r); // upkeep -50 -> 3950; value *1.1 -> 1100
    expect(g.assets['money']).toBe(3950);
    expect(g.ownedAssets[0]!.value).toBe(1100);
  });

  it('sellAsset credits current value and removes it', () => {
    const r = reg();
    const g = game(r, 5000);
    buyAsset(g, r, 'asset.house');
    const id = g.ownedAssets[0]!.id;
    expect(sellAsset(g, id)).toBe(true);
    expect(g.assets['money']).toBe(5000); // bought 1000, sold 1000
    expect(g.ownedAssets).toHaveLength(0);
    expect(sellAsset(g, 'nope')).toBe(false);
  });
});

describe('ribbons', () => {
  it('selects the highest-priority matching ribbon', () => {
    const r = reg();
    const rich = game(r, 50000);
    expect(selectRibbon(rich, r)?.id).toBe('ribbon.rich');
    const poor = game(r, 0);
    expect(selectRibbon(poor, r)?.id).toBe('ribbon.ok'); // only the unconditional one matches
  });

  it('is awarded at death via the turn loop', () => {
    const r = reg();
    const g = game(r, 50000);
    g.stats['health'] = 0;
    ageUp(g, r); // death check fires
    expect(g.character.alive).toBe(false);
    expect(g.ribbon?.id).toBe('ribbon.rich');
  });
});
