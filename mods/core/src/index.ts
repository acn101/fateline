import type { FatelineMod } from '@fateline/mod-schema';
import coreJson from '../generated/core.json' with { type: 'json' };

/**
 * The core module as a pre-validated, bundlable object (README §8 — base game
 * IS a module). Generated from the YAML by `generate.mjs`; the app imports this
 * directly so no filesystem/YAML parsing happens at runtime (works in RN).
 */
export const coreMod = coreJson as FatelineMod;
