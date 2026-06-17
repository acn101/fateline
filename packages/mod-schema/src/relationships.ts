import { z } from 'zod';
import { conditionListSchema } from './conditions.js';
import { outcomeSchema, contentIdSchema } from './events.js';

/**
 * Relationship content — README §4.5.2.
 *
 * An *archetype* is a template for a kind of NPC (its type and starting
 * relationship stats). A *relationship-action* is a player action aimed at a
 * specific NPC; its conditions/effects may use the `rel.*` targets that resolve
 * against that NPC.
 */

/** NPC archetype: a template `addRelationship` instantiates. */
export const archetypeSchema = z
  .object({
    id: contentIdSchema,
    /** Relationship category, e.g. `friend`, `partner`, `parent`, `child`. */
    type: z.string().min(1),
    /** Default display name if name generation is off and none is supplied. */
    defaultName: z.string().min(1).default('Someone'),
    /**
     * If true, the engine generates a believable, gendered name from the
     * demographics pools instead of using `defaultName` (goal item 7).
     */
    generateName: z.boolean().default(true),
    /** Force a gender for generated NPCs; omit for a random one. */
    gender: z.enum(['male', 'female', 'x']).optional(),
    /** Starting per-relationship stat values (e.g. { relationship: 50 }). */
    stats: z.record(z.string(), z.number()).default({}),
  })
  .strict();

export const relationshipActionSchema = z
  .object({
    id: contentIdSchema,
    label: z.string().min(1),
    /** Relationship types this action can target (empty = any type). */
    appliesTo: z.array(z.string().min(1)).default([]),
    /** Gate (may use rel.* targets, §4.5.2). */
    conditions: conditionListSchema,
    /** Weighted outcomes; effects may use rel.* and addRelationship/removeRelationship. */
    outcomes: z.array(outcomeSchema).min(1),
  })
  .strict();

export type Archetype = z.infer<typeof archetypeSchema>;
export type RelationshipAction = z.infer<typeof relationshipActionSchema>;
