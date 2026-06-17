import { load as parseYaml } from 'js-yaml';
import { validateMod, type FatelineMod, type ValidationResult } from '@fateline/mod-schema';

/**
 * A flat map of in-memory module files: path (POSIX, relative to module root)
 * -> text contents. Every import source produces one of these; the pipeline
 * then parses, merges, and validates it (README §6 — one shared pipeline).
 */
export type RawModFiles = Record<string, string>;

/** Folder -> schema content key (mirrors the on-disk loader, README §5.1). */
const FOLDER_TO_CONTENT_KEY: Record<string, string> = {
  definitions: 'stats',
  events: 'events',
  actions: 'actions',
};

/**
 * Assemble + validate a module from an in-memory file map. Mirrors
 * loadModFromDir but works without a filesystem so it runs in React Native.
 */
export function assembleMod(files: RawModFiles): ValidationResult<FatelineMod> {
  const manifestText = files['mod.yaml'] ?? files['mod.yml'];
  if (manifestText === undefined) {
    return { ok: false, errors: [{ path: '', message: 'Module is missing mod.yaml.' }] };
  }

  const content: Record<string, unknown[]> = {};
  for (const [path, text] of Object.entries(files)) {
    const match = /^content\/([^/]+)\/[^/]+\.ya?ml$/.exec(path);
    if (!match) continue;
    const key = FOLDER_TO_CONTENT_KEY[match[1]!];
    if (key === undefined) continue; // unknown content folder; ignored
    const items = content[key] ?? [];
    items.push(...extractItems(parseYaml(text), key));
    content[key] = items;
  }

  return validateMod({ manifest: parseYaml(manifestText), content });
}

/** Normalize one parsed YAML doc into a list (array | wrapped | single). */
export function extractItems(parsed: unknown, key: string): unknown[] {
  if (parsed == null) return [];
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'object' && key in (parsed as Record<string, unknown>)) {
    const wrapped = (parsed as Record<string, unknown>)[key];
    return Array.isArray(wrapped) ? wrapped : [wrapped];
  }
  return [parsed];
}
