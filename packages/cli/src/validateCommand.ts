import { loadModuleFromDir } from '@fateline/module-io';
import { compileRegistry, smokeTest, type SmokeReport } from '@fateline/engine';

/**
 * The `fateline-validate` command logic (README §11.2), separated from the
 * process entry point so it is unit-testable. Loads a module from disk,
 * validates it through the public schema, then runs a headless smoke test.
 */

export interface ValidateOptions {
  lives?: number;
  maxYears?: number;
  /**
   * Additional module directories loaded *before* the target into the smoke
   * registry. Expansions depend on the base game for a vitality stat etc., so
   * pass `--with <core-dir>` to test them in a realistic composition.
   */
  withModules?: string[];
}

export interface ValidateReport {
  ok: boolean;
  /** Human-readable lines suitable for printing to stdout/stderr. */
  lines: string[];
  smoke?: SmokeReport;
}

export async function validateModuleAt(
  dir: string,
  options: ValidateOptions = {},
): Promise<ValidateReport> {
  const lines: string[] = [];

  const loaded = await loadModuleFromDir(dir).catch((err: unknown) => {
    return { ok: false as const, errors: [{ path: '', message: errMessage(err) }] };
  });

  if (!loaded.ok) {
    lines.push('✗ Schema/safety validation failed:');
    for (const issue of loaded.errors) {
      lines.push(`  - ${issue.path ? issue.path + ': ' : ''}${issue.message}`);
    }
    return { ok: false, lines };
  }

  lines.push(`✓ Schema valid: ${loaded.value.manifest.id} v${loaded.value.manifest.version}`);
  lines.push(
    `  ${loaded.value.content.stats.length} stat(s), ${loaded.value.content.events.length} event(s)`,
  );

  // Load any base modules (e.g. core) first, then the target, so expansions
  // are smoke-tested in a realistic composition (README §5.5 load order).
  const base = [];
  for (const baseDir of options.withModules ?? []) {
    const baseLoaded = await loadModuleFromDir(baseDir).catch((err: unknown) => ({
      ok: false as const,
      errors: [{ path: '', message: errMessage(err) }],
    }));
    if (!baseLoaded.ok) {
      lines.push(`✗ Could not load --with module at ${baseDir}.`);
      return { ok: false, lines };
    }
    base.push(baseLoaded.value);
  }

  const registry = compileRegistry([...base, loaded.value]);
  const smoke = smokeTest(registry, options);

  if (smoke.ok) {
    lines.push(`✓ Smoke test passed: ${smoke.livesRun} lives simulated with no problems`);
  } else {
    lines.push(`✗ Smoke test found ${smoke.problems.length} problem(s):`);
    for (const p of smoke.problems.slice(0, 10)) {
      lines.push(`  - [seed ${p.seed}] ${p.kind}: ${p.detail}`);
    }
    if (smoke.problems.length > 10) {
      lines.push(`  …and ${smoke.problems.length - 10} more.`);
    }
  }

  return { ok: smoke.ok, lines, smoke };
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
