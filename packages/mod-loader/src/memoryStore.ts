import type { FatelineMod } from '@fateline/mod-schema';
import type { ModStore } from './install.js';

/**
 * A ModStore backed by a serializable JSON blob. The app persists the blob
 * via @fateline/persistence; tests use it directly in memory. Keeps installed
 * modules and their load order together.
 */
export interface ModStoreData {
  modules: Record<string, FatelineMod>;
  order: string[];
}

export function emptyStoreData(): ModStoreData {
  return { modules: {}, order: [] };
}

export function createMemoryModStore(initial: ModStoreData = emptyStoreData()): {
  store: ModStore;
  data: ModStoreData;
} {
  const data: ModStoreData = { modules: { ...initial.modules }, order: [...initial.order] };
  const store: ModStore = {
    put: async (id, module) => void (data.modules[id] = module),
    get: async (id) => data.modules[id] ?? null,
    remove: async (id) => {
      delete data.modules[id];
      data.order = data.order.filter((x) => x !== id);
    },
    listIds: async () => [...data.order],
    setOrder: async (ids) => void (data.order = [...ids]),
  };
  return { store, data };
}
