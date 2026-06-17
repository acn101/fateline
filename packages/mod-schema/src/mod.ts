import { z } from 'zod';
import { manifestSchema } from './manifest.js';
import { statDefinitionSchema } from './stats.js';
import { eventSchema } from './events.js';
import { actionSchema } from './actions.js';
import { archetypeSchema, relationshipActionSchema } from './relationships.js';
import { careerSchema, educationProgramSchema } from './careers.js';
import { assetTypeSchema, ribbonSchema } from './assets.js';
import { countrySchema, ethnicitySchema } from './demographics.js';

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
        archetypes: z.array(archetypeSchema).default([]),
        relationshipActions: z.array(relationshipActionSchema).default([]),
        careers: z.array(careerSchema).default([]),
        education: z.array(educationProgramSchema).default([]),
        assetTypes: z.array(assetTypeSchema).default([]),
        ribbons: z.array(ribbonSchema).default([]),
        countries: z.array(countrySchema).default([]),
        ethnicities: z.array(ethnicitySchema).default([]),
      })
      .strict()
      .default({
        stats: [],
        events: [],
        actions: [],
        archetypes: [],
        relationshipActions: [],
        careers: [],
        education: [],
        assetTypes: [],
        ribbons: [],
        countries: [],
        ethnicities: [],
      }),
  })
  .strict();

export type FatelineMod = z.infer<typeof modSchema>;
