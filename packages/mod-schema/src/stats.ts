import { z } from 'zod';

/**
 * Declared stat schema — README §4.4.
 *
 * A first-class stat the engine clamps, displays, and (optionally) decays each
 * age-up. The core stats (health, happiness, ...) are declared this exact way
 * in `mods/core/`, so there is no hardcoded stat list in the engine.
 */

/** Local stat id within a module, e.g. `karma`. Namespaced by module id later. */
export const localFieldIdSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9_]*$/,
    'Field id must be lower_snake_case starting with a letter, e.g. "karma".',
  );

export const statDefinitionSchema = z
  .object({
    id: localFieldIdSchema,
    label: z.string().min(1).max(60),
    min: z.number(),
    max: z.number(),
    default: z.number(),
    showInUI: z.boolean().default(true),
    /** Optional passive drift applied each age-up. */
    yearlyDelta: z.number().default(0),
    /**
     * Publish under a stable global name so other modules can read/write it.
     * Sharing is opt-in (README §4.4); absent => stat stays module-namespaced.
     */
    exposeAs: localFieldIdSchema.optional(),
  })
  .strict()
  .refine((s) => s.min <= s.max, { message: 'min must be <= max', path: ['min'] })
  .refine((s) => s.default >= s.min && s.default <= s.max, {
    message: 'default must be within [min, max]',
    path: ['default'],
  });

export type StatDefinition = z.infer<typeof statDefinitionSchema>;
