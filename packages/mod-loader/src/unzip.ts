import { unzipSync, strFromU8 } from 'fflate';
import type { RawModFiles } from './assemble.js';

/**
 * Unzip an archive (Uint8Array) into a RawModFiles map. Archives from GitHub
 * wrap everything in a top-level folder (e.g. `repo-main/`); we strip the
 * common leading path segment so `mod.yaml` lands at the root.
 */
export function unzipMod(data: Uint8Array): RawModFiles {
  const entries = unzipSync(data);
  const paths = Object.keys(entries).filter((p) => !p.endsWith('/'));
  const prefix = commonPrefix(paths);

  const files: RawModFiles = {};
  for (const path of paths) {
    const rel = path.slice(prefix.length);
    if (rel === '') continue;
    files[rel] = strFromU8(entries[path]!);
  }
  return files;
}

/** Longest common leading directory segment shared by all paths. */
export function commonPrefix(paths: string[]): string {
  if (paths.length === 0) return '';
  const first = paths[0]!;
  const slash = first.indexOf('/');
  if (slash === -1) return '';
  const candidate = first.slice(0, slash + 1);
  return paths.every((p) => p.startsWith(candidate)) ? candidate : '';
}
