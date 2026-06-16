import { z } from 'zod';

/**
 * Effect language — README §5.3.
 *
 * Each effect mutates one piece of game state. Numeric ops (+, -, *) apply to
 * stats/assets; `set` assigns; `push`/`remove` operate on list-like flags.
 * `triggerEvent` chains a follow-up event (cycle-checked at validation time).
 */

export const numericOpSchema = z.enum(['+', '-', '*']);
const effectValueSchema = z.union([z.number(), z.string(), z.boolean()]);

export const effectSchema = z.union([
  // Stat / asset arithmetic or assignment.
  z.object({ stat: z.string(), op: z.enum(['+', '-', '*', 'set']), value: z.number() }).strict(),
  z.object({ asset: z.string(), op: z.enum(['+', '-', '*', 'set']), value: z.number() }).strict(),

  // Flag assignment (set) — the common case from the README example.
  z.object({ flag: z.string(), op: z.literal('set'), value: effectValueSchema }).strict(),

  // List-valued flag mutation.
  z.object({ flag: z.string(), op: z.enum(['push', 'remove']), value: effectValueSchema }).strict(),

  // Chain a follow-up event by id.
  z.object({ triggerEvent: z.string().min(1) }).strict(),
]);

export type Effect = z.infer<typeof effectSchema>;
export type NumericOp = z.infer<typeof numericOpSchema>;

export const effectListSchema = z.array(effectSchema).default([]);
