import { describe, expect, it } from 'vitest';
import { validateMod, type FatelineMod } from '@fateline/mod-schema';
import { addRelationship } from '@fateline/engine';
import { createGameStore } from './gameStore.js';
import { visibleStats, actionMenu, relationshipViews, careerView } from './selectors.js';

function coreLikeMod(): FatelineMod {
  const raw = {
    manifest: {
      id: 'com.test.core',
      name: 'Core',
      version: '1.0.0',
      engineVersion: '*',
      author: 'a',
      description: '',
      dependencies: [],
    },
    content: {
      stats: [
        {
          id: 'health',
          label: 'Health',
          min: 0,
          max: 100,
          default: 5,
          yearlyDelta: -1,
          exposeAs: 'health',
        },
        { id: 'secret', label: 'Secret', min: 0, max: 100, default: 0, showInUI: false },
      ],
      events: [
        {
          id: 'evt.test',
          weight: 1,
          conditions: [{ stat: 'age', op: '>=', value: 1 }],
          title: 'A choice appears.',
          choices: [
            {
              text: 'A',
              outcomes: [
                { weight: 1, effects: [{ stat: 'health', op: '+', value: 1 }], resultText: 'a' },
              ],
            },
            { text: 'B', outcomes: [{ weight: 1, effects: [], resultText: 'b' }] },
          ],
        },
      ],
      actions: [
        {
          id: 'act.rest',
          label: 'Rest',
          category: 'mind-body',
          conditions: [{ stat: 'age', op: '>=', value: 1 }],
          outcomes: [
            { weight: 1, effects: [{ stat: 'health', op: '+', value: 2 }], resultText: 'Rested.' },
          ],
        },
      ],
      archetypes: [
        { id: 'arch.friend', type: 'friend', defaultName: 'Sam', stats: { relationship: 50 } },
      ],
      relationshipActions: [
        {
          id: 'rel.compliment',
          label: 'Compliment',
          appliesTo: [],
          conditions: [],
          outcomes: [
            {
              weight: 1,
              effects: [{ 'rel.stat': 'relationship', op: '+', value: 5 }],
              resultText: 'Nice.',
            },
          ],
        },
      ],
      careers: [
        {
          id: 'career.clerk',
          title: 'Clerk',
          field: 'service',
          requirements: [{ stat: 'age', op: '>=', value: 1 }],
          levels: [{ title: 'Clerk', salary: 30000 }],
        },
      ],
      education: [
        {
          id: 'edu.school',
          title: 'School',
          requirements: [{ stat: 'age', op: '>=', value: 1 }],
          years: 1,
          grantsFlags: ['diploma'],
        },
      ],
    },
  };
  const r = validateMod(raw);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.value as FatelineMod;
}

describe('createGameStore', () => {
  it('runs the full session lifecycle', () => {
    const store = createGameStore();
    store.getState().loadMods([coreLikeMod()]);
    store.getState().startGame({
      seed: 1,
      character: { name: 'A', gender: 'x', birthYear: 2000 },
      assets: { money: 0 },
    });

    expect(store.getState().game?.character.age).toBe(0);
    store.getState().advance();
    const pending = store.getState().pending;
    expect(pending?.event.id).toBe('evt.test');

    store.getState().choose(0);
    expect(store.getState().pending).toBeNull();
    expect(store.getState().game?.history.length).toBeGreaterThan(0);
  });

  it('guards against invalid transitions', () => {
    const store = createGameStore();
    expect(() =>
      store
        .getState()
        .startGame({ seed: 1, character: { name: 'A', gender: 'x', birthYear: 2000 } }),
    ).toThrow();
    store.getState().loadMods([coreLikeMod()]);
    store.getState().startGame({ seed: 1, character: { name: 'A', gender: 'x', birthYear: 2000 } });
    expect(() => store.getState().choose(0)).toThrow(); // no pending event
    store.getState().advance();
    expect(() => store.getState().advance()).toThrow(); // pending unresolved
  });

  it('does not advance a dead character', () => {
    const store = createGameStore();
    store.getState().loadMods([coreLikeMod()]);
    store.getState().startGame({ seed: 2, character: { name: 'A', gender: 'x', birthYear: 2000 } });
    const g = store.getState().game!;
    g.character.alive = false;
    store.getState().hydrate(g);
    store.getState().advance();
    expect(store.getState().game?.character.age).toBe(0);
  });
});

describe('visibleStats selector', () => {
  it('includes only showInUI stats, joined with current values', () => {
    const store = createGameStore();
    store.getState().loadMods([coreLikeMod()]);
    store.getState().startGame({ seed: 1, character: { name: 'A', gender: 'x', birthYear: 2000 } });
    const stats = visibleStats(store.getState().registry!, store.getState().game!);
    expect(stats.map((s) => s.id)).toEqual(['health']);
    expect(stats[0]!.label).toBe('Health');
    expect(stats[0]!.value).toBe(5);
  });

  it('falls back to the declared default when a value is missing', () => {
    const store = createGameStore();
    store.getState().loadMods([coreLikeMod()]);
    store.getState().startGame({ seed: 1, character: { name: 'A', gender: 'x', birthYear: 2000 } });
    const game = store.getState().game!;
    delete game.stats['health'];
    const stats = visibleStats(store.getState().registry!, game);
    expect(stats[0]!.value).toBe(5); // def.default
  });
});

describe('actions: act() + actionMenu selector', () => {
  function started() {
    const store = createGameStore();
    store.getState().loadMods([coreLikeMod()]);
    store.getState().startGame({ seed: 1, character: { name: 'A', gender: 'x', birthYear: 2000 } });
    store.getState().advance(); // reach age 1 so age>=1 conditions hold
    return store;
  }

  it('actionMenu groups available actions by category', () => {
    const store = started();
    // Resolve any pending event first so state is settled.
    if (store.getState().pending) store.getState().choose(0);
    const groups = actionMenu(store.getState().registry!, store.getState().game!);
    expect(groups.map((g) => g.category)).toContain('mind-body');
    expect(groups[0]!.actions.some((a) => a.id === 'act.rest')).toBe(true);
  });

  it('act() applies the action and records history', () => {
    const store = started();
    if (store.getState().pending) store.getState().choose(0);
    const before = store.getState().game!.stats['health']!;
    store.getState().act('act.rest');
    expect(store.getState().game!.stats['health']).toBe(before + 2);
    expect(store.getState().game!.history.at(-1)?.text).toBe('Rest');
  });

  it('act() throws when no game is in progress', () => {
    const store = createGameStore();
    store.getState().loadMods([coreLikeMod()]);
    expect(() => store.getState().act('act.rest')).toThrow();
  });
});

describe('relationships: interact() + relationshipViews', () => {
  function withNpc() {
    const store = createGameStore();
    store.getState().loadMods([coreLikeMod()]);
    store.getState().startGame({ seed: 1, character: { name: 'A', gender: 'x', birthYear: 2000 } });
    const { registry, game } = store.getState();
    addRelationship(game!, registry!, 'arch.friend', 'Sam');
    store.getState().hydrate(game!);
    return store;
  }

  it('relationshipViews lists living NPCs with their interactions', () => {
    const store = withNpc();
    const views = relationshipViews(store.getState().registry!, store.getState().game!);
    expect(views).toHaveLength(1);
    expect(views[0]!.npc.name).toBe('Sam');
    expect(views[0]!.actions.map((a) => a.id)).toContain('rel.compliment');
  });

  it('interact() applies the relationship-action to the NPC', () => {
    const store = withNpc();
    const npcId = store.getState().game!.relationships[0]!.id;
    store.getState().interact(npcId, 'rel.compliment');
    expect(store.getState().game!.relationships[0]!.stats['relationship']).toBe(55);
  });

  it('interact() throws when no game is in progress', () => {
    const store = createGameStore();
    store.getState().loadMods([coreLikeMod()]);
    expect(() => store.getState().interact('rel.x', 'rel.compliment')).toThrow();
  });
});

describe('careers/education: applyJob/quitJob/enroll + careerView', () => {
  function started() {
    const store = createGameStore();
    store.getState().loadMods([coreLikeMod()]);
    store.getState().startGame({ seed: 1, character: { name: 'A', gender: 'x', birthYear: 2000 } });
    store.getState().advance();
    if (store.getState().pending) store.getState().choose(0);
    return store;
  }

  it('careerView reports open jobs/programs and current status', () => {
    const store = started();
    const view = careerView(store.getState().registry!, store.getState().game!);
    expect(view.current).toBeNull();
    expect(view.openJobs.map((c) => c.id)).toContain('career.clerk');
    expect(view.openPrograms.map((p) => p.id)).toContain('edu.school');
  });

  it('applyJob sets current job; quitJob clears it', () => {
    const store = started();
    store.getState().applyJob('career.clerk');
    expect(careerView(store.getState().registry!, store.getState().game!).current?.title).toBe(
      'Clerk',
    );
    store.getState().quitJob();
    expect(store.getState().game!.career).toBeNull();
  });

  it('enroll sets current education and careerView reflects it', () => {
    const store = started();
    store.getState().enroll('edu.school');
    expect(store.getState().game!.education?.programId).toBe('edu.school');
    const view = careerView(store.getState().registry!, store.getState().game!);
    expect(view.enrolledIn?.title).toBe('School');
    expect(view.enrolledIn?.years).toBe(1);
  });

  it('careerView shows the current job after applying', () => {
    const store = started();
    store.getState().applyJob('career.clerk');
    const view = careerView(store.getState().registry!, store.getState().game!);
    expect(view.current?.title).toBe('Clerk');
    expect(view.current?.salary).toBe(30000);
  });

  it('career methods throw with no game in progress', () => {
    const store = createGameStore();
    store.getState().loadMods([coreLikeMod()]);
    expect(() => store.getState().applyJob('career.clerk')).toThrow();
    expect(() => store.getState().quitJob()).toThrow();
    expect(() => store.getState().enroll('edu.school')).toThrow();
  });
});
