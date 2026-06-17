import type { ZodType } from 'zod';
import { manifestSchema, type Manifest } from './manifest.js';
import { modSchema, type FatelineMod } from './mod.js';
import type { Effect } from './effects.js';

/** Result of a safe-parse over untrusted module data. */
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: ValidationIssue[] };

export interface ValidationIssue {
  /** Dotted path to the offending field, e.g. "dependencies.0.version". */
  path: string;
  message: string;
}

function safeParse<T>(schema: ZodType<T>, input: unknown): ValidationResult<T> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  return {
    ok: false,
    errors: parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

/**
 * Validate a parsed module manifest (already YAML/JSON-decoded into a plain
 * object). Never throws — returns a structured result so callers can surface
 * human-readable errors and reject the module (README §5.4).
 */
export function validateManifest(input: unknown): ValidationResult<Manifest> {
  return safeParse(manifestSchema, input);
}

/**
 * Validate a full module: Zod schema (§5.4 step 2), then structural checks —
 * reference integrity for `triggerEvent` targets (step 3) and cycle detection
 * to forbid infinite trigger loops (step 4). Never throws.
 */
export function validateMod(input: unknown): ValidationResult<FatelineMod> {
  const parsed = safeParse(modSchema, input);
  if (!parsed.ok) return parsed;

  const mod = parsed.value;
  const issues: ValidationIssue[] = [];

  const eventIds = new Set(mod.content.events.map((e) => e.id));
  const duplicateIds = findDuplicates(mod.content.events.map((e) => e.id));
  for (const id of duplicateIds) {
    issues.push({ path: 'content.events', message: `Duplicate event id "${id}".` });
  }

  // Reference integrity: every triggerEvent must point at a known event id.
  // Also build the trigger graph for cycle detection.
  const triggerGraph = new Map<string, string[]>();
  for (const event of mod.content.events) {
    const targets: string[] = [];
    event.choices.forEach((choice, ci) => {
      choice.outcomes.forEach((outcome, oi) => {
        outcome.effects.forEach((effect, ei) => {
          if ('triggerEvent' in effect) {
            const target = effect.triggerEvent;
            targets.push(target);
            if (!eventIds.has(target)) {
              issues.push({
                path: `content.events.${event.id}.choices.${ci}.outcomes.${oi}.effects.${ei}.triggerEvent`,
                message: `triggerEvent references unknown event id "${target}".`,
              });
            }
          }
        });
      });
    });
    triggerGraph.set(event.id, targets);
  }

  for (const cycle of findCycles(triggerGraph)) {
    issues.push({
      path: 'content.events',
      message: `Infinite trigger loop detected: ${cycle.join(' -> ')}.`,
    });
  }

  // Actions: unique ids, and any triggerEvent in an outcome must resolve.
  for (const id of findDuplicates(mod.content.actions.map((a) => a.id))) {
    issues.push({ path: 'content.actions', message: `Duplicate action id "${id}".` });
  }
  mod.content.actions.forEach((action) => {
    action.outcomes.forEach((outcome, oi) => {
      outcome.effects.forEach((effect, ei) => {
        if ('triggerEvent' in effect && !eventIds.has(effect.triggerEvent)) {
          issues.push({
            path: `content.actions.${action.id}.outcomes.${oi}.effects.${ei}.triggerEvent`,
            message: `triggerEvent references unknown event id "${effect.triggerEvent}".`,
          });
        }
      });
    });
  });

  // Relationships (§4.5.2): unique archetype + relationship-action ids, and
  // every `addRelationship` must reference a declared archetype.
  const archetypeIds = new Set(mod.content.archetypes.map((a) => a.id));
  for (const id of findDuplicates(mod.content.archetypes.map((a) => a.id))) {
    issues.push({ path: 'content.archetypes', message: `Duplicate archetype id "${id}".` });
  }
  for (const id of findDuplicates(mod.content.relationshipActions.map((a) => a.id))) {
    issues.push({
      path: 'content.relationshipActions',
      message: `Duplicate relationship-action id "${id}".`,
    });
  }
  const checkAddRel = (effects: readonly Effect[], path: string) => {
    effects.forEach((effect, ei) => {
      if ('addRelationship' in effect && !archetypeIds.has(effect.addRelationship)) {
        issues.push({
          path: `${path}.${ei}.addRelationship`,
          message: `addRelationship references unknown archetype "${effect.addRelationship}".`,
        });
      }
    });
  };
  mod.content.events.forEach((e) =>
    e.choices.forEach((c, ci) =>
      c.outcomes.forEach((o, oi) =>
        checkAddRel(o.effects, `content.events.${e.id}.choices.${ci}.outcomes.${oi}.effects`),
      ),
    ),
  );
  mod.content.relationshipActions.forEach((a) =>
    a.outcomes.forEach((o, oi) =>
      checkAddRel(o.effects, `content.relationshipActions.${a.id}.outcomes.${oi}.effects`),
    ),
  );

  // Careers & education (§4.5.3): unique ids.
  for (const id of findDuplicates(mod.content.careers.map((c) => c.id))) {
    issues.push({ path: 'content.careers', message: `Duplicate career id "${id}".` });
  }
  for (const id of findDuplicates(mod.content.education.map((e) => e.id))) {
    issues.push({ path: 'content.education', message: `Duplicate education id "${id}".` });
  }

  if (issues.length > 0) return { ok: false, errors: issues };
  return { ok: true, value: mod };
}

function findDuplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  return [...dupes];
}

/** Returns one representative cycle per strongly-connected trigger loop. */
function findCycles(graph: Map<string, string[]>): string[][] {
  const cycles: string[][] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];

  const visit = (node: string): void => {
    const status = state.get(node);
    if (status === 'done') return;
    if (status === 'visiting') {
      const start = stack.indexOf(node);
      cycles.push([...stack.slice(start), node]);
      return;
    }
    state.set(node, 'visiting');
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      if (graph.has(next)) visit(next);
    }
    stack.pop();
    state.set(node, 'done');
  };

  for (const node of graph.keys()) visit(node);
  return cycles;
}
