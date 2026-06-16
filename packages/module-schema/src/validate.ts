import { manifestSchema, type Manifest } from './manifest.js';

/** Result of a safe-parse over untrusted module data. */
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: ValidationIssue[] };

export interface ValidationIssue {
  /** Dotted path to the offending field, e.g. "dependencies.0.version". */
  path: string;
  message: string;
}

/**
 * Validate a parsed module manifest (already YAML/JSON-decoded into a plain
 * object). Never throws — returns a structured result so callers can surface
 * human-readable errors and reject the module (README §5.4).
 */
export function validateManifest(input: unknown): ValidationResult<Manifest> {
  const parsed = manifestSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }
  return {
    ok: false,
    errors: parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}
