import { z } from 'zod';
import { conditionListSchema } from './conditions.js';
import { effectListSchema } from './effects.js';

/**
 * Event schema — README §5.3.
 *
 * An event fires when its conditions match. The player picks a choice; one of
 * that choice's weighted outcomes is selected and its effects applied.
 */

/** Content id, e.g. `evt.found-wallet`. Namespaced by module id at load. */
export const contentIdSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9]*\.[a-z0-9][a-z0-9-]*$/,
    'Content id must look like "kind.name", e.g. "evt.found-wallet".',
  );

export const outcomeSchema = z
  .object({
    weight: z.number().positive(),
    effects: effectListSchema,
    resultText: z.string().min(1),
  })
  .strict();

export const choiceSchema = z
  .object({
    text: z.string().min(1),
    /** Optional gate: a choice can be hidden unless its conditions hold. */
    conditions: conditionListSchema,
    outcomes: z.array(outcomeSchema).min(1),
  })
  .strict();

export const eventSchema = z
  .object({
    id: contentIdSchema,
    category: z.string().min(1).default('random'),
    /** Selection weight among eligible events; higher = more likely. */
    weight: z.number().positive().default(1),
    conditions: conditionListSchema,
    /** Minimum years before this event can fire again. */
    cooldownYears: z.number().int().nonnegative().default(0),
    /** Fire at most once per life. */
    once: z.boolean().default(false),
    title: z.string().min(1),
    choices: z.array(choiceSchema).min(1),
  })
  .strict();

export type Outcome = z.infer<typeof outcomeSchema>;
export type Choice = z.infer<typeof choiceSchema>;
export type GameEvent = z.infer<typeof eventSchema>;
