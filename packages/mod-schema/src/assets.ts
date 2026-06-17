import { z } from 'zod';
import { conditionListSchema } from './conditions.js';
import { contentIdSchema } from './events.js';

/**
 * Asset & ribbon content — README §4.5.4–5.
 *
 * An asset type is something ownable: a price to buy, optional yearly upkeep,
 * and optional appreciation/depreciation. A ribbon is an end-of-life summary
 * whose conditions are checked against the final state; the highest-priority
 * matching ribbon is awarded.
 */

export const assetTypeSchema = z
  .object({
    id: contentIdSchema,
    label: z.string().min(1),
    category: z.string().min(1).default('general'),
    price: z.number().nonnegative(),
    /** Debited from `money` each age-up while owned. */
    yearlyUpkeep: z.number().nonnegative().default(0),
    /** Fractional value change per year, e.g. 0.03 = +3%, -0.1 = -10%. */
    yearlyValueChange: z.number().default(0),
    /** Gate on whether the asset can be purchased (reuses §5.3 conditions). */
    conditions: conditionListSchema,
  })
  .strict();

export const ribbonSchema = z
  .object({
    id: contentIdSchema,
    label: z.string().min(1),
    /** Higher priority wins when multiple ribbons match. */
    priority: z.number().default(0),
    /** Evaluated against the final game state at death. */
    conditions: conditionListSchema,
  })
  .strict();

export type AssetType = z.infer<typeof assetTypeSchema>;
export type Ribbon = z.infer<typeof ribbonSchema>;
