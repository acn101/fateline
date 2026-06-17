import { z } from 'zod';
import { conditionListSchema } from './conditions.js';
import { contentIdSchema } from './events.js';

/**
 * Career & education content — README §4.5.3.
 *
 * A career is a ladder of levels (title + salary + promotion odds). Education
 * is the same shape: a program with entry requirements and a duration that, on
 * completion, grants flags careers can require.
 */

export const careerLevelSchema = z
  .object({
    title: z.string().min(1),
    salary: z.number().nonnegative(),
    /** Years at this level before a promotion check (omit for the top level). */
    promoteAfterYears: z.number().int().positive().optional(),
    /** Probability [0,1] of promotion once eligible. */
    promoteChance: z.number().min(0).max(1).default(0.5),
  })
  .strict();

export const careerSchema = z
  .object({
    id: contentIdSchema,
    title: z.string().min(1),
    field: z.string().min(1).default('general'),
    /** Entry requirements to be hired (reuses §5.3 conditions). */
    requirements: conditionListSchema,
    /** The promotion ladder, bottom to top. */
    levels: z.array(careerLevelSchema).min(1),
  })
  .strict();

export const educationProgramSchema = z
  .object({
    id: contentIdSchema,
    title: z.string().min(1),
    /** Entry requirements to enroll. */
    requirements: conditionListSchema,
    /** Years to complete. */
    years: z.number().int().positive(),
    /** Optional yearly tuition (debited from `money` each year enrolled). */
    yearlyTuition: z.number().nonnegative().default(0),
    /** Flags set to true on completion (e.g. `degree_medicine`). */
    grantsFlags: z.array(z.string().min(1)).default([]),
  })
  .strict();

export type CareerLevel = z.infer<typeof careerLevelSchema>;
export type Career = z.infer<typeof careerSchema>;
export type EducationProgram = z.infer<typeof educationProgramSchema>;
