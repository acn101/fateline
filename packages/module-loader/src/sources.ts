import { load as parseYaml } from 'js-yaml';
import type { RawModuleFiles } from './assemble.js';
import { unzipModule } from './unzip.js';

/**
 * The four import sources (README §6). Each resolves to a RawModuleFiles map
 * that feeds the single shared install pipeline. All network access uses the
 * global `fetch`, so these run in React Native, web, and Node alike.
 */

export type Fetcher = typeof fetch;

/** 1. Paste raw YAML/JSON — a single module document pasted as text. */
export function fromPaste(text: string): RawModuleFiles {
  // Treat the whole paste as module.yaml; authors paste a self-contained doc
  // with manifest + content keys, which assembleModule/validateModule accept.
  // If it parses as an object with a `manifest`, re-emit it as such.
  const parsed = parseYaml(text);
  if (parsed && typeof parsed === 'object' && 'manifest' in parsed) {
    return { 'module.yaml': text };
  }
  // Otherwise assume it is a manifest-only paste.
  return { 'module.yaml': text };
}

/** 2. Direct file upload — bytes of a .zip, or text of a .yaml/.json. */
export function fromUpload(filename: string, data: Uint8Array | string): RawModuleFiles {
  if (filename.endsWith('.zip')) {
    if (typeof data === 'string') throw new Error('Zip upload must be binary, not text.');
    return unzipModule(data);
  }
  const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
  return { 'module.yaml': text };
}

/**
 * 3. GitHub repo/release link. Resolves a repo URL to its default-branch
 * tarball/zipball (public, no auth) and unzips it. Accepts forms like
 * https://github.com/owner/repo or .../owner/repo/releases/tag/v1.
 */
export async function fromGithub(url: string, fetcher: Fetcher = fetch): Promise<RawModuleFiles> {
  const ref = parseGithubUrl(url);
  if (!ref) throw new Error(`Not a recognized GitHub URL: ${url}`);
  const zipUrl = `https://codeload.github.com/${ref.owner}/${ref.repo}/zip/${ref.ref}`;
  const res = await fetcher(zipUrl);
  if (!res.ok) throw new Error(`GitHub download failed (${res.status}) for ${zipUrl}`);
  return unzipModule(new Uint8Array(await res.arrayBuffer()));
}

export interface GithubRef {
  owner: string;
  repo: string;
  /** A branch name or tag; defaults to HEAD. */
  ref: string;
}

export function parseGithubUrl(url: string): GithubRef | null {
  const m =
    /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/(?:tree|releases\/tag)\/([^/]+))?\/?$/.exec(url);
  if (!m) return null;
  return { owner: m[1]!, repo: m[2]!, ref: m[3] ?? 'HEAD' };
}

export interface RegistryEntry {
  id: string;
  name: string;
  description: string;
  /** GitHub URL the entry installs from. */
  source: string;
}

/** 4a. Fetch the curated registry index (a JSON array of entries). */
export async function fetchRegistry(
  indexUrl: string,
  fetcher: Fetcher = fetch,
): Promise<RegistryEntry[]> {
  const res = await fetcher(indexUrl);
  if (!res.ok) throw new Error(`Registry fetch failed (${res.status}).`);
  const data = (await res.json()) as { modules?: RegistryEntry[] };
  return data.modules ?? [];
}

/** 4b. Install a registry entry by delegating to its GitHub source. */
export function fromRegistryEntry(entry: RegistryEntry, fetcher: Fetcher = fetch) {
  return fromGithub(entry.source, fetcher);
}
