import type { FatelineModule, ValidationResult } from '@fateline/module-schema';
import { assembleModule, type RawModuleFiles } from './assemble.js';

/**
 * Install pipeline (README §6): acquire (done by a source) -> assemble +
 * validate -> store -> register. A module that fails validation is never
 * stored. Storage is injected so this runs on any platform.
 */

export interface ModuleStore {
  /** Persist a validated module's JSON under its id. */
  put(id: string, module: FatelineModule): Promise<void>;
  get(id: string): Promise<FatelineModule | null>;
  remove(id: string): Promise<void>;
  /** Installed module ids in load order. */
  listIds(): Promise<string[]>;
  /** Replace the load order (must be a permutation of installed ids). */
  setOrder(ids: string[]): Promise<void>;
}

/**
 * Validate raw module files and, if valid, store + register them. Returns the
 * validation result so the UI can show errors on failure (README §5.4).
 */
export async function installModule(
  files: RawModuleFiles,
  store: ModuleStore,
): Promise<ValidationResult<FatelineModule>> {
  const result = assembleModule(files);
  if (!result.ok) return result;

  await store.put(result.value.manifest.id, result.value);
  const order = await store.listIds();
  if (!order.includes(result.value.manifest.id)) {
    await store.setOrder([...order, result.value.manifest.id]);
  }
  return result;
}

/**
 * Load all installed modules in load order, ready for compileRegistry. Skips
 * (and reports) any that fail to dependency-resolve.
 */
export async function loadInstalled(store: ModuleStore): Promise<{
  modules: FatelineModule[];
  missingDependencies: { id: string; missing: string[] }[];
}> {
  const ids = await store.listIds();
  const present = new Set(ids);
  const modules: FatelineModule[] = [];
  const missingDependencies: { id: string; missing: string[] }[] = [];

  for (const id of ids) {
    const mod = await store.get(id);
    if (!mod) continue;
    const missing = mod.manifest.dependencies.map((d) => d.id).filter((d) => !present.has(d));
    if (missing.length > 0) {
      missingDependencies.push({ id, missing });
      continue; // dependency not satisfied; don't enable (README §5.5)
    }
    modules.push(mod);
  }

  return { modules, missingDependencies };
}
