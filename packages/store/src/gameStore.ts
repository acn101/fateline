import { createStore } from 'zustand/vanilla';
import type { FatelineModule } from '@fateline/module-schema';
import {
  compileRegistry,
  createGame,
  ageUp,
  applyChoice,
  type GameState,
  type Registry,
  type PendingEvent,
  type NewGameOptions,
} from '@fateline/engine';

/**
 * Game session store (README §7) — a vanilla Zustand store so it is usable
 * from React (via useStore) and directly testable in Node. It owns the
 * compiled registry, the current GameState, and the event awaiting a choice.
 */

export interface GameStore {
  registry: Registry | null;
  game: GameState | null;
  pending: PendingEvent | null;
  /** Set once at startup from the enabled modules. */
  loadModules: (modules: readonly FatelineModule[]) => void;
  startGame: (options: NewGameOptions) => void;
  /** Advance one year; surfaces a pending event if one fires. */
  advance: () => void;
  /** Resolve the pending event with the chosen option index. */
  choose: (choiceIndex: number) => void;
  /** Replace the whole session (e.g. after loading a save). */
  hydrate: (game: GameState) => void;
}

export function createGameStore() {
  return createStore<GameStore>((set, get) => ({
    registry: null,
    game: null,
    pending: null,

    loadModules: (modules) => set({ registry: compileRegistry(modules) }),

    startGame: (options) => {
      const { registry } = get();
      if (!registry) throw new Error('loadModules must be called before startGame.');
      set({ game: createGame(registry, options), pending: null });
    },

    advance: () => {
      const { registry, game, pending } = get();
      if (!registry || !game) throw new Error('No game in progress.');
      if (pending) throw new Error('Resolve the pending event before advancing.');
      if (!game.character.alive) return;
      const next = ageUp(game, registry);
      // ageUp mutates `game` in place; clone the reference so React re-renders.
      set({ game: { ...game }, pending: next });
    },

    choose: (choiceIndex) => {
      const { registry, game, pending } = get();
      if (!registry || !game || !pending) throw new Error('No pending event to resolve.');
      applyChoice(game, registry, pending, choiceIndex);
      set({ game: { ...game }, pending: null });
    },

    hydrate: (game) => set({ game: { ...game }, pending: null }),
  }));
}

export type GameStoreApi = ReturnType<typeof createGameStore>;
