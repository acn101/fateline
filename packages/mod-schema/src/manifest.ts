import { z } from 'zod';

/**
 * Module manifest schema (`mod.yaml`) — see README §5.2.
 *
 * This is part of THE contract between the app and untrusted community
 * modules. Keep it strict: unknown keys are rejected so typos surface as
 * clear validation errors rather than silently-ignored content.
 */

/** Reverse-DNS-style unique id, e.g. `com.author.medieval-life`. */
export const moduleIdSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(\.[a-z0-9-]+)+$/,
    'Module id must be reverse-DNS style, e.g. "com.author.my-module".',
  );

/** Semantic version, e.g. `1.2.0`. */
export const semverSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?$/, 'Version must be semver, e.g. "1.2.0".');

export const dependencySchema = z
  .object({
    id: moduleIdSchema,
    /** A semver range the dependency must satisfy, e.g. ">=1.0.0 <2.0.0". */
    version: z.string().min(1),
  })
  .strict();

export const manifestSchema = z
  .object({
    id: moduleIdSchema,
    name: z.string().min(1).max(120),
    version: semverSchema,
    /** Engine semver range this module is compatible with. */
    engineVersion: z.string().min(1),
    author: z.string().min(1).max(120),
    description: z.string().max(2000).default(''),
    dependencies: z.array(dependencySchema).default([]),
  })
  .strict();

export type Manifest = z.infer<typeof manifestSchema>;
export type Dependency = z.infer<typeof dependencySchema>;
