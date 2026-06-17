import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { validateMod, type FatelineMod, type ValidationResult } from '@fateline/mod-schema';

/**
 * Map an on-disk content folder (README §5.1) to its schema content key.
 * The folder name and the schema key differ for stats: authors put stat
 * declarations in `content/definitions/`, but the schema key is `stats`.
 */
const FOLDER_TO_CONTENT_KEY: Record<string, string> = {
  definitions: 'stats',
  events: 'events',
  actions: 'actions',
};

/**
 * Read a module from its on-disk layout (README §5.1) and validate it.
 *
 *   mod.yaml                    -> manifest
 *   content/definitions/*.yaml     -> content.stats
 *   content/events/*.yaml          -> content.events
 *
 * Each content file may hold a single object or a YAML array; both are
 * flattened into the kind's array. Returns the same structured ValidationResult
 * as the schema package, so callers handle success/failure uniformly.
 */
export async function loadModFromDir(dir: string): Promise<ValidationResult<FatelineMod>> {
  const manifestRaw = await readFile(join(dir, 'mod.yaml'), 'utf8');
  const manifest = parseYaml(manifestRaw);

  const content: Record<string, unknown[]> = {};
  const contentDir = join(dir, 'content');
  for (const folder of await listDirs(contentDir)) {
    const key = FOLDER_TO_CONTENT_KEY[folder];
    // Unknown content folders are ignored here; strict schema validation below
    // would reject them anyway, and silently keying them produces worse errors.
    if (key === undefined) continue;
    const items: unknown[] = [];
    const kindDir = join(contentDir, folder);
    for (const file of await listYamlFiles(kindDir)) {
      items.push(...extractItems(parseYaml(await readFile(join(kindDir, file), 'utf8')), key));
    }
    content[key] = items;
  }

  return validateMod({ manifest, content });
}

/**
 * Normalize one parsed YAML file into a list of content items. Accepts three
 * author conventions: a bare array, a single object, or an object that wraps
 * its items under the content key (e.g. `stats:` in `definitions/stats.yaml`,
 * matching the README §4.4 example).
 */
export function extractItems(parsed: unknown, key: string): unknown[] {
  if (parsed == null) return [];
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'object' && key in (parsed as Record<string, unknown>)) {
    const wrapped = (parsed as Record<string, unknown>)[key];
    return Array.isArray(wrapped) ? wrapped : [wrapped];
  }
  return [parsed];
}

async function listDirs(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => []);
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function listYamlFiles(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((e) => e.isFile() && (e.name.endsWith('.yaml') || e.name.endsWith('.yml')))
    .map((e) => e.name)
    .sort();
}
