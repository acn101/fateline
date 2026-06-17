import { z } from 'zod';

/**
 * Condition language — README §5.3.
 *
 * Leaf conditions compare a target against a value with an operator. Groups
 * (`any` / `all`) compose them into a tree. A bare array of conditions is
 * treated as implicit `all` by the engine.
 */

export const comparisonOpSchema = z.enum(['==', '!=', '>', '>=', '<', '<=', 'in']);
export type ComparisonOp = z.infer<typeof comparisonOpSchema>;

/** Primitive a condition can compare against. `in` expects an array. */
const conditionValueSchema = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  z.array(z.union([z.number(), z.string(), z.boolean()])),
]);

const baseLeaf = { op: comparisonOpSchema, value: conditionValueSchema };

/**
 * Leaf condition. Exactly one target key selects what is being compared:
 * - `stat`: a stat id; the reserved id `age` resolves from `character.age`.
 * - `flag`: a flag key.
 * - `asset`: an asset id (e.g. `money`).
 * - `random: true`: gates on a fresh RNG draw in [0, 1).
 *
 * Within a relationship-action (§4.5.2), three more targets resolve against the
 * NPC the action is aimed at: `rel.stat`, `rel.flag`, and `rel.type`.
 */
export const leafConditionSchema = z.union([
  z.object({ stat: z.string(), ...baseLeaf }).strict(),
  z.object({ flag: z.string(), ...baseLeaf }).strict(),
  z.object({ asset: z.string(), ...baseLeaf }).strict(),
  z.object({ random: z.literal(true), ...baseLeaf }).strict(),
  z.object({ 'rel.stat': z.string(), ...baseLeaf }).strict(),
  z.object({ 'rel.flag': z.string(), ...baseLeaf }).strict(),
  z.object({ 'rel.type': z.literal(true), ...baseLeaf }).strict(),
]);

export type LeafCondition = z.infer<typeof leafConditionSchema>;

// Recursive condition tree: leaf | { all: [...] } | { any: [...] }.
export type Condition = LeafCondition | { all: Condition[] } | { any: Condition[] };

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    leafConditionSchema,
    z.object({ all: z.array(conditionSchema).min(1) }).strict(),
    z.object({ any: z.array(conditionSchema).min(1) }).strict(),
  ]),
);

/** Author convenience: a bare list of conditions means "all of these". */
export const conditionListSchema = z.array(conditionSchema).default([]);
