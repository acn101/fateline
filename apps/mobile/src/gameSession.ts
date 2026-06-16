import { useStore } from 'zustand';
import { createGameStore, type GameStore } from '@fateline/store';
import { coreModule } from '@fateline/module-core';

/**
 * App-wide game session. A single store instance is created at module load and
 * seeded with the bundled core module; additional modules (Phase 5) will be
 * merged here once the loader exists.
 */
export const gameStore = createGameStore();
gameStore.getState().loadModules([coreModule]);

/** React binding for the vanilla store. */
export function useGame<T>(selector: (state: GameStore) => T): T {
  return useStore(gameStore, selector);
}
