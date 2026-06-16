import type { StorageBackend } from '@fateline/persistence';

/**
 * A StorageBackend over Web Storage / a localStorage-like API. On web this is
 * `window.localStorage`; on native, AsyncStorage exposes the same shape via a
 * thin async wrapper (wired when building the native binary). Falls back to an
 * in-memory map when no storage is available (e.g. SSR/static render).
 */
interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length: number;
  key(index: number): string | null;
}

function resolveStorage(): KeyValue {
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    return (globalThis as unknown as { localStorage: KeyValue }).localStorage;
  }
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
  };
}

export function createWebStorageBackend(): StorageBackend {
  const kv = resolveStorage();
  return {
    getItem: async (key) => kv.getItem(key),
    setItem: async (key, value) => kv.setItem(key, value),
    removeItem: async (key) => kv.removeItem(key),
    keys: async () => {
      const out: string[] = [];
      for (let i = 0; i < kv.length; i++) {
        const k = kv.key(i);
        if (k !== null) out.push(k);
      }
      return out;
    },
  };
}
