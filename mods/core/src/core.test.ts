import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compileRegistry, createGame, ageUp, applyChoice } from '@fateline/engine';
import { loadModFromDir } from '@fateline/mod-io';
import type { FatelineMod } from '@fateline/mod-schema';
import { coreMod } from './index.js';

const coreDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Validate the YAML source of truth from disk (catches un-regenerated edits). */
async function loadValidCore(): Promise<FatelineMod> {
  const result = await loadModFromDir(coreDir);
  if (!result.ok) {
    throw new Error('core module failed validation:\n' + JSON.stringify(result.errors, null, 2));
  }
  return result.value;
}

describe('core module (README §8 — base game is a module)', () => {
  it('validates cleanly through the public schema', async () => {
    const mod = await loadValidCore();
    expect(mod.manifest.id).toBe('com.fateline.core');
    expect(mod.content.stats.length).toBeGreaterThanOrEqual(4);
    expect(mod.content.events.length).toBeGreaterThan(0);
    // health is exposed globally and serves as the vitality stat.
    expect(mod.content.stats.some((s) => s.exposeAs === 'health')).toBe(true);
  });

  it('compiles into a registry with a resolved vitality stat', async () => {
    const reg = compileRegistry([await loadValidCore()]);
    expect(reg.vitalityStatId).toBe('health');
    expect(reg.stats.get('happiness')).toBeDefined();
  });

  it('exports a generated coreMod kept in sync with the YAML source', async () => {
    // Guards against editing YAML without re-running `generate`.
    expect(coreMod).toEqual(await loadValidCore());
  });

  it('plays a full, deterministic life to its natural end', async () => {
    const reg = compileRegistry([await loadValidCore()]);
    const play = () => {
      const game = createGame(reg, {
        seed: 'a-whole-life',
        character: { name: 'Alex', gender: 'x', birthYear: 2000 },
        assets: { money: 0 },
      });
      // Age up well past the maximum survivable age; the life must end on its own.
      for (let year = 0; year < 130 && game.character.alive; year++) {
        const pending = ageUp(game, reg);
        if (pending) applyChoice(game, reg, pending, 0);
      }
      return game;
    };

    const a = play();
    const b = play();

    expect(a).toEqual(b); // deterministic
    expect(a.character.alive).toBe(false); // life ended through content-driven mortality
    expect(a.history.some((h) => h.text === 'You died.')).toBe(true);
    expect(a.ribbon).not.toBeNull(); // every life earns an end-of-life ribbon (§4.5.5)
    // Stats never escaped their declared bounds.
    for (const value of Object.values(a.stats)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
    // A real life accumulated a meaningful history.
    expect(a.history.length).toBeGreaterThan(10);
  });

  it('every life across many seeds terminates without getting stuck', async () => {
    const reg = compileRegistry([await loadValidCore()]);
    for (let seed = 0; seed < 50; seed++) {
      const game = createGame(reg, {
        seed,
        character: { name: 'P', gender: 'x', birthYear: 2000 },
      });
      let guard = 0;
      while (game.character.alive && guard < 200) {
        const pending = ageUp(game, reg);
        if (pending) applyChoice(game, reg, pending, 0);
        guard++;
      }
      expect(game.character.alive).toBe(false);
    }
  });
});
