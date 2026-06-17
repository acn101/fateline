import type { Country, Ethnicity, NamePool } from '@fateline/mod-schema';
import type { Gender } from './state.js';
import type { Registry } from './registry.js';
import { nextInt, weightedPick, type RngState } from './rng.js';

/**
 * Character & NPC identity generation — goal items 4–8. Turns demographics
 * content (countries, ethnicities, name pools) into believable, gendered,
 * culturally-flavored identities. Deterministic given the RNG.
 */

export interface Identity {
  name: string;
  gender: Gender;
  ethnicity: string; // ethnicity id, or ''
  country: string; // country id, or ''
  birthplace: string; // city name, or ''
}

const GENDERS: Gender[] = ['male', 'female', 'x'];

function pick<T>(rng: RngState, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[nextInt(rng, 0, items.length - 1)];
}

/** Pick from a list using each item's `weight`, falling back to uniform. */
function weightedPickBy<T extends { weight: number }>(
  rng: RngState,
  items: readonly T[],
): T | undefined {
  if (items.length === 0) return undefined;
  return items[
    weightedPick(
      rng,
      items.map((i) => i.weight),
    )
  ];
}

/** Choose a given name from a pool appropriate to the gender. */
function givenName(rng: RngState, pool: NamePool | undefined, gender: Gender): string | undefined {
  if (!pool) return undefined;
  const byGender = gender === 'male' ? pool.male : gender === 'female' ? pool.female : pool.neutral;
  const candidates =
    byGender.length > 0 ? byGender : [...pool.male, ...pool.female, ...pool.neutral];
  return pick(rng, candidates);
}

/**
 * Build a full name for the given gender, preferring the ethnicity's name
 * pool, then the country's, blending given name + surname where available.
 */
export function generateName(
  rng: RngState,
  gender: Gender,
  country: Country | undefined,
  ethnicity: Ethnicity | undefined,
): string {
  const pools = [ethnicity?.names, country?.names].filter((p): p is NamePool => p !== undefined);
  const given = pools.map((p) => givenName(rng, p, gender)).find((n) => n !== undefined);
  const surname = pools.map((p) => pick(rng, p.surnames)).find((n) => n !== undefined);
  if (given && surname) return `${given} ${surname}`;
  if (given) return given;
  return 'Anonymous';
}

export interface GenerateOptions {
  gender?: Gender;
  countryId?: string;
}

/** Generate a full birth identity from the registry's demographics. */
export function generateIdentity(
  rng: RngState,
  registry: Registry,
  options: GenerateOptions = {},
): Identity {
  const gender = options.gender ?? GENDERS[nextInt(rng, 0, GENDERS.length - 1)]!;

  const countries = [...registry.countries.values()];
  const country = options.countryId
    ? registry.countries.get(options.countryId)
    : weightedPickBy(rng, countries);

  // Ethnicity: prefer one of the country's listed ethnicities, weighted.
  let ethnicity: Ethnicity | undefined;
  const countryEths = (country?.ethnicities ?? [])
    .map((id) => registry.ethnicities.get(id))
    .filter((e): e is Ethnicity => e !== undefined);
  if (countryEths.length > 0) ethnicity = weightedPickBy(rng, countryEths);
  else ethnicity = weightedPickBy(rng, [...registry.ethnicities.values()]);

  return {
    name: generateName(rng, gender, country, ethnicity),
    gender,
    ethnicity: ethnicity?.id ?? '',
    country: country?.id ?? '',
    birthplace: (country && pick(rng, country.cities)) ?? '',
  };
}

/** A lighter identity for NPCs: just a gendered name (no country/birthplace). */
export function generateNpcName(rng: RngState, registry: Registry, gender: Gender): string {
  // Use a random country/ethnicity's pool so NPC names have variety.
  const country = pick(rng, [...registry.countries.values()]);
  const ethnicity = pick(rng, [...registry.ethnicities.values()]);
  return generateName(rng, gender, country, ethnicity);
}

/** Random gender for an NPC. */
export function randomGender(rng: RngState): Gender {
  return GENDERS[nextInt(rng, 0, GENDERS.length - 1)]!;
}

/** A birth candidate: an identity plus a flavor blurb for the chooser screen. */
export interface BirthCandidate extends Identity {
  /** Country label for display (or 'Somewhere'). */
  countryLabel: string;
  /** Ethnicity label for display (or ''). */
  ethnicityLabel: string;
}

/**
 * Roll `count` distinct birth candidates for the "choose who to be born as"
 * screen (goal item 6). Deterministic given the RNG.
 */
export function rollBirthCandidates(
  rng: RngState,
  registry: Registry,
  count = 3,
  options: GenerateOptions = {},
): BirthCandidate[] {
  const out: BirthCandidate[] = [];
  for (let i = 0; i < count; i++) {
    const identity = generateIdentity(rng, registry, options);
    out.push({
      ...identity,
      countryLabel: registry.countries.get(identity.country)?.label ?? 'Somewhere',
      ethnicityLabel: registry.ethnicities.get(identity.ethnicity)?.label ?? '',
    });
  }
  return out;
}
