import type { FatelineModule } from '@fateline/module-schema';
import type { ModuleStore } from './install.js';

/**
 * A ModuleStore backed by a serializable JSON blob. The app persists the blob
 * via @fateline/persistence; tests use it directly in memory. Keeps installed
 * modules and their load order together.
 */
export interface ModuleStoreData {
  modules: Record<string, FatelineModule>;
  order: string[];
}

export function emptyStoreData(): ModuleStoreData {
  return { modules: {}, order: [] };
}

export function createMemoryModuleStore(initial: ModuleStoreData = emptyStoreData()): {
  store: ModuleStore;
  data: ModuleStoreData;
} {
  const data: ModuleStoreData = { modules: { ...initial.modules }, order: [...initial.order] };
  const store: ModuleStore = {
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
