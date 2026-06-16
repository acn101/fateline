import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadModuleFromDir } from '@fateline/module-io';
import type { FatelineModule, ValidationResult } from '@fateline/module-schema';

/** Absolute path to this module's on-disk root (where `module.yaml` lives). */
export const coreModuleDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Load and validate the core module from disk (README §8 — base game IS a module). */
export function loadCoreModule(): Promise<ValidationResult<FatelineModule>> {
  return loadModuleFromDir(coreModuleDir);
}
