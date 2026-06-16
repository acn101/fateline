import { useState, useEffect } from 'react';
import { useStore } from 'zustand';
import { createGameStore, type GameStore } from '@fateline/store';
import { coreModule } from '@fateline/module-core';
import { createMemoryModuleStore, loadInstalled } from '@fateline/module-loader';

/**
 * App-wide game session and module registry.
 *
 * The module store is seeded with the bundled core module and grows as the
 * user installs more (Modules screen). After any change, refreshSession()
 * recompiles the engine registry from all installed, dependency-satisfied
 * modules. (A persistent ModuleStore is wired in Phase 7; in-memory for now.)
 */
export const gameStore = createGameStore();

const { store: moduleStore, data: moduleData } = createMemoryModuleStore();
export { moduleStore };

// Seed the bundled base game so a fresh install is immediately playable.
moduleData.modules[coreModule.manifest.id] = coreModule;
moduleData.order.push(coreModule.manifest.id);

let installedIds: string[] = [];
const listeners = new Set<() => void>();

export async function refreshSession(): Promise<void> {
  const { modules } = await loadInstalled(moduleStore);
  gameStore.getState().loadModules(modules);
  installedIds = modules.map((m) => m.manifest.id);
  listeners.forEach((l) => l());
}

void refreshSession();

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
