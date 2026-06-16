import { useState, useEffect } from 'react';
import { useStore } from 'zustand';
import { createGameStore, type GameStore } from '@fateline/store';
import { coreMod } from '@fateline/mod-core';
import { createMemoryModStore, loadInstalled } from '@fateline/mod-loader';
import { SaveManager } from '@fateline/persistence';
import { createWebStorageBackend } from './storageBackend';

const AUTOSAVE_SLOT = 'autosave';
const saveManager = new SaveManager(createWebStorageBackend());

/**
 * App-wide game session and module registry.
 *
 * The module store is seeded with the bundled core module and grows as the
 * user installs more (Modules screen). After any change, refreshSession()
 * recompiles the engine registry from all installed, dependency-satisfied
 * modules. (A persistent ModStore is wired in Phase 7; in-memory for now.)
 */
export const gameStore = createGameStore();

const { store: modStore, data: moduleData } = createMemoryModStore();
export { modStore };

// Seed the bundled base game so a fresh install is immediately playable.
moduleData.modules[coreMod.manifest.id] = coreMod;
moduleData.order.push(coreMod.manifest.id);

let installedIds: string[] = [];
const listeners = new Set<() => void>();

export async function refreshSession(): Promise<void> {
  const { modules } = await loadInstalled(modStore);
  gameStore.getState().loadMods(modules);
  installedIds = modules.map((m) => m.manifest.id);
  listeners.forEach((l) => l());
}

void refreshSession();

// Autosave: persist the current game whenever it changes.
gameStore.subscribe((state) => {
  if (state.game) void saveManager.save(AUTOSAVE_SLOT, state.game);
});

/** Restore the autosaved game, if any. Returns true if a save was loaded. */
export async function restoreAutosave(): Promise<boolean> {
  const game = await saveManager.load(AUTOSAVE_SLOT);
  if (!game) return false;
  gameStore.getState().hydrate(game);
  return true;
}

/** React binding for the vanilla game store. */
export function useGame<T>(selector: (state: GameStore) => T): T {
  return useStore(gameStore, selector);
}

/** React binding for the installed module id list. */
export function useInstalledIds(): string[] {
  const [ids, setIds] = useState(installedIds);
  useEffect(() => {
    const update = () => setIds(installedIds);
    listeners.add(update);
    update();
    return () => void listeners.delete(update);
  }, []);
  return ids;
}
