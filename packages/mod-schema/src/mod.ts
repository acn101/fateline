import { z } from 'zod';
import { manifestSchema } from './manifest.js';
import { statDefinitionSchema } from './stats.js';
import { eventSchema } from './events.js';
import { actionSchema } from './actions.js';

/**
 * Full module schema — manifest (§5.2) + content (§5.1). This is the shape a
 * loaded, parsed module takes after YAML files are merged into one object.
 */
export const modSchema = z
  .object({
    manifest: manifestSchema,
    content: z
      .object({
        stats: z.array(statDefinitionSchema).default([]),
        events: z.array(eventSchema).default([]),
        actions: z.array(actionSchema).default([]),
      })
      .strict()
      .default({ stats: [], events: [], actions: [] }),
  })
  .strict();

export type FatelineMod = z.infer<typeof modSchema>;
