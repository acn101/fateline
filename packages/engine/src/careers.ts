import type { Career, EducationProgram } from '@fateline/mod-schema';
import type { GameState } from './state.js';
import type { Registry } from './registry.js';
import { evaluateAll } from './conditions.js';
import { nextFloat } from './rng.js';
import { getAsset } from './accessors.js';

/**
 * Career & education interpreter — README §4.5.3. Jobs and schooling are
 * ladders the engine advances each age-up: salary is deposited, promotions and
 * firings are rolled, education accrues years and grants degree flags on
 * completion. Application/enrollment are player actions.
 */

const MONEY = 'money';

export type ApplyError = 'no-career' | 'requirements' | 'already-employed';
export type EnrollError = 'no-program' | 'requirements' | 'already-enrolled';

/** Careers the player currently qualifies for (and isn't already working). */
export function availableCareers(state: GameState, registry: Registry): Career[] {
  if (!state.character.alive || state.career) return [];
  return [...registry.careers.values()].filter((c) =>
    evaluateAll(c.requirements, state, state.rng),
  );
}

/** Apply to (and immediately start) a job at its entry level. */
export function applyToJob(
  state: GameState,
  registry: Registry,
  careerId: string,
): ApplyError | null {
  if (state.career) return 'already-employed';
  const career = registry.careers.get(careerId);
  if (!career) return 'no-career';
  if (!evaluateAll(career.requirements, state, state.rng)) return 'requirements';
  state.career = { careerId, level: 0, yearsInLevel: 0 };
  state.history.push({
    age: state.character.age,
    text: `You got a job: ${career.levels[0]!.title}.`,
  });
  return null;
}

/** Quit the current job. */
export function quitJob(state: GameState): void {
  if (!state.career) return;
  state.career = null;
  state.history.push({ age: state.character.age, text: 'You quit your job.' });
}

/** Education programs the player qualifies for and isn't already enrolled in. */
export function availablePrograms(state: GameState, registry: Registry): EducationProgram[] {
  if (!state.character.alive || state.education) return [];
  return [...registry.education.values()].filter((p) =>
    evaluateAll(p.requirements, state, state.rng),
  );
}

/** Enroll in an education program. */
export function enroll(
  state: GameState,
  registry: Registry,
  programId: string,
): EnrollError | null {
  if (state.education) return 'already-enrolled';
  const program = registry.education.get(programId);
  if (!program) return 'no-program';
  if (!evaluateAll(program.requirements, state, state.rng)) return 'requirements';
  state.education = { programId, yearsCompleted: 0 };
  state.history.push({ age: state.character.age, text: `You enrolled in ${program.title}.` });
  return null;
}

/**
 * Per-age-up progression for job + schooling. Called by the turn loop after
 * decay. Deposits salary, rolls promotion/firing, accrues tuition + education.
 */
export function advanceCareerAndEducation(state: GameState, registry: Registry): void {
  advanceCareer(state, registry);
  advanceEducation(state, registry);
}

function advanceCareer(state: GameState, registry: Registry): void {
  const job = state.career;
  if (!job) return;
  const career = registry.careers.get(job.careerId);
  if (!career) {
    state.career = null;
    return;
  }
  const level = career.levels[job.level]!;
  state.assets[MONEY] = getAsset(state, MONEY) + level.salary;
  job.yearsInLevel += 1;

  // Promotion check once eligible and a higher level exists.
  const nextLevel = career.levels[job.level + 1];
  if (
    nextLevel &&
    level.promoteAfterYears !== undefined &&
    job.yearsInLevel >= level.promoteAfterYears &&
    nextFloat(state.rng) < level.promoteChance
  ) {
    job.level += 1;
    job.yearsInLevel = 0;
    state.history.push({ age: state.character.age, text: `Promoted to ${nextLevel.title}!` });
  }
}

function advanceEducation(state: GameState, registry: Registry): void {
  const enrollment = state.education;
  if (!enrollment) return;
  const program = registry.education.get(enrollment.programId);
  if (!program) {
    state.education = null;
    return;
  }
  if (program.yearlyTuition > 0) {
    state.assets[MONEY] = getAsset(state, MONEY) - program.yearlyTuition;
  }
  enrollment.yearsCompleted += 1;
  if (enrollment.yearsCompleted >= program.years) {
    for (const flag of program.grantsFlags) state.flags[flag] = true;
    state.education = null;
    state.history.push({ age: state.character.age, text: `You graduated from ${program.title}.` });
  }
}
