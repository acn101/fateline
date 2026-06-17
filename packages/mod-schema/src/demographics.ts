import { z } from 'zod';
import { contentIdSchema } from './events.js';

/**
 * Demographics content — countries, ethnicities, and name pools used to
 * generate believable, gendered, culturally-flavored characters and NPCs.
 * This is what lets a life have an identity (gender, ethnicity, country) and
 * gives people real names instead of "Friend" (goal items 4–8).
 */

/** Given-name pools split by gender, plus a shared surname pool. */
export const namePoolSchema = z
  .object({
    male: z.array(z.string().min(1)).default([]),
    female: z.array(z.string().min(1)).default([]),
    /** Names usable for any gender (also used for `x`). */
    neutral: z.array(z.string().min(1)).default([]),
    surnames: z.array(z.string().min(1)).default([]),
  })
  .strict();

export const ethnicitySchema = z
  .object({
    id: contentIdSchema,
    label: z.string().min(1),
    /** Relative weight when an ethnicity is randomly assigned. */
    weight: z.number().positive().default(1),
    /** Optional name pool specific to this ethnicity. */
    names: namePoolSchema.optional(),
  })
  .strict();

export const countrySchema = z
  .object({
    id: contentIdSchema,
    label: z.string().min(1),
    /** ISO-ish code for display (e.g. "US"). */
    code: z.string().min(1).max(4).default(''),
    weight: z.number().positive().default(1),
    /** Cities a character from here may be born in. */
    cities: z.array(z.string().min(1)).min(1),
    /** Ethnicity ids common to this country (used to weight birth ethnicity). */
    ethnicities: z.array(z.string().min(1)).default([]),
    /** Fallback name pool for the country if an ethnicity has none. */
    names: namePoolSchema.optional(),
  })
  .strict();

export type NamePool = z.infer<typeof namePoolSchema>;
export type Ethnicity = z.infer<typeof ethnicitySchema>;
export type Country = z.infer<typeof countrySchema>;
