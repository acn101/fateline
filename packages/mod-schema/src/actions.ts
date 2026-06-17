import { z } from 'zod';
import { conditionListSchema } from './conditions.js';
import { outcomeSchema } from './events.js';
import { contentIdSchema } from './events.js';

/**
 * Action schema — README §4.5.1.
 *
 * An action is a player-initiated, repeatable choice from the Activities menu.
 * Unlike an event (engine-pushed, resolved once per age-up), an action is
 * pulled by the player and may be taken multiple times a year, subject to an
 * optional cost and per-year limit. It reuses the weighted-outcome model.
 */

/** A resource cost to take an action: asset id -> amount debited. */
export const costSchema = z.record(z.string(), z.number().nonnegative());

export const actionSchema = z
  .object({
    id: contentIdSchema,
    label: z.string().min(1),
    category: z.string().min(1).default('general'),
    /** When the action is offered (ALL must hold; reuses §5.3 conditions). */
    conditions: conditionListSchema,
    /** Optional resource cost, debited when taken (must be affordable). */
    cost: costSchema.optional(),
    /** Optional cap on how many times it may be taken per year. */
    perYearLimit: z.number().int().positive().optional(),
    /** Weighted outcomes, picked like an event choice's outcomes. */
    outcomes: z.array(outcomeSchema).min(1),
  })
  .strict();

export type Cost = z.infer<typeof costSchema>;
export type GameAction = z.infer<typeof actionSchema>;
