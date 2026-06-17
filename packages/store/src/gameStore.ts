import { createStore } from 'zustand/vanilla';
import type { FatelineMod } from '@fateline/mod-schema';
import {
  compileRegistry,
  createGame,
  ageUp,
  applyChoice,
  takeAction,
  takeRelationshipAction,
  applyToJob,
  quitJob,
  enroll,
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
  loadMods: (modules: readonly FatelineMod[]) => void;
  startGame: (options: NewGameOptions) => void;
  /** Advance one year; surfaces a pending event if one fires. */
  advance: () => void;
  /** Resolve the pending event with the chosen option index. */
  choose: (choiceIndex: number) => void;
  /** Take an Activities-menu action by id (§4.5.1). */
  act: (actionId: string) => void;
  /** Take a relationship-action against an NPC (§4.5.2). */
  interact: (npcId: string, actionId: string) => void;
  /** Apply to a job by career id (§4.5.3). */
  applyJob: (careerId: string) => void;
  /** Quit the current job. */
  quitJob: () => void;
  /** Enroll in an education program (§4.5.3). */
  enroll: (programId: string) => void;
  /** Replace the whole session (e.g. after loading a save). */
  hydrate: (game: GameState) => void;
}

export function createGameStore() {
  return createStore<GameStore>((set, get) => ({
    registry: null,
    game: null,
    pending: null,

    loadMods: (modules) => set({ registry: compileRegistry(modules) }),

    startGame: (options) => {
      const { registry } = get();
      if (!registry) throw new Error('loadMods must be called before startGame.');
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

    act: (actionId) => {
      const { registry, game } = get();
      if (!registry || !game) throw new Error('No game in progress.');
      takeAction(game, registry, actionId);
      set({ game: { ...game } });
    },

    interact: (npcId, actionId) => {
      const { registry, game } = get();
      if (!registry || !game) throw new Error('No game in progress.');
      takeRelationshipAction(game, registry, npcId, actionId);
      set({ game: { ...game } });
    },

    applyJob: (careerId) => {
      const { registry, game } = get();
      if (!registry || !game) throw new Error('No game in progress.');
      applyToJob(game, registry, careerId);
      set({ game: { ...game } });
    },

    quitJob: () => {
      const { game } = get();
      if (!game) throw new Error('No game in progress.');
      quitJob(game);
      set({ game: { ...game } });
    },

    enroll: (programId) => {
      const { registry, game } = get();
      if (!registry || !game) throw new Error('No game in progress.');
      enroll(game, registry, programId);
      set({ game: { ...game } });
    },

    hydrate: (game) => set({ game: { ...game }, pending: null }),
  }));
}

export type GameStoreApi = ReturnType<typeof createGameStore>;
