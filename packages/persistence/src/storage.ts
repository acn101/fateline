/**
 * Storage backend abstraction (README §2 — expo-sqlite/AsyncStorage on device).
 * The persistence logic is platform-agnostic; the app injects a concrete
 * backend, and tests use an in-memory one. Keys map to JSON string values.
 */
export interface StorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

/** In-memory backend for tests and previews. */
export function createMemoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return {
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => void map.set(k, v),
    removeItem: async (k) => void map.delete(k),
    keys: async () => [...map.keys()],
  };
}
