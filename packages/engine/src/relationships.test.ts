import { describe, expect, it } from 'vitest';
import { validateMod, type FatelineMod } from '@fateline/mod-schema';
import { compileRegistry } from './registry.js';
import { createGame } from './turn.js';
import { addRelationship, applyEffects } from './effects.js';
import { relationshipActions, takeRelationshipAction } from './relationships.js';

function compile(raw: unknown) {
  const r = validateMod(raw);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return compileRegistry([r.value as FatelineMod]);
}

const manifest = {
  id: 'com.test.core',
  name: 'C',
  version: '1.0.0',
  engineVersion: '*',
  author: 'a',
  description: '',
  dependencies: [],
};

function reg() {
  return compile({
    manifest,
    content: {
      stats: [{ id: 'health', label: 'H', min: 0, max: 100, default: 50, exposeAs: 'health' }],
      events: [],
      actions: [],
      archetypes: [
        { id: 'arch.friend', type: 'friend', defaultName: 'Sam', stats: { relationship: 50 } },
      ],
      relationshipActions: [
        {
          id: 'rel.compliment',
          label: 'Compliment',
          appliesTo: ['friend'],
          conditions: [{ 'rel.stat': 'relationship', op: '<', value: 100 }],
          outcomes: [
            {
              weight: 1,
              effects: [{ 'rel.stat': 'relationship', op: '+', value: 10 }],
              resultText: 'Nice!',
            },
          ],
        },
        {
          id: 'rel.partner-only',
          label: 'Propose',
          appliesTo: ['partner'],
          conditions: [],
          outcomes: [{ weight: 1, effects: [], resultText: 'ok' }],
        },
      ],
    },
  });
}

function newGame(r: ReturnType<typeof reg>) {
  return createGame(r, { seed: 1, character: { name: 'A', gender: 'x', birthYear: 2000 } });
}

describe('addRelationship', () => {
  it('instantiates an NPC from an archetype with starting stats', () => {
    const r = reg();
    const g = newGame(r);
    const npc = addRelationship(g, r, 'arch.friend', 'Alex');
    expect(npc?.name).toBe('Alex');
    expect(npc?.type).toBe('friend');
    expect(npc?.stats['relationship']).toBe(50);
    expect(g.relationships).toHaveLength(1);
  });

  it('uses the archetype default name and returns undefined for unknown archetypes', () => {
    const r = reg();
    const g = newGame(r);
    expect(addRelationship(g, r, 'arch.friend')?.name).toBe('Sam');
    expect(addRelationship(g, r, 'arch.nope')).toBeUndefined();
  });

  it('addRelationship effect works through applyEffects', () => {
    const r = reg();
    const g = newGame(r);
    applyEffects([{ addRelationship: 'arch.friend' }], g, r);
    expect(g.relationships).toHaveLength(1);
  });
});

describe('relationshipActions + takeRelationshipAction', () => {
  it('lists only actions applicable to the NPC type', () => {
    const r = reg();
    const g = newGame(r);
    const npc = addRelationship(g, r, 'arch.friend')!;
    expect(relationshipActions(g, r, npc.id).map((a) => a.id)).toEqual(['rel.compliment']);
  });

  it('takes an action targeting the NPC and mutates its rel.stat', () => {
    const r = reg();
    const g = newGame(r);
    const npc = addRelationship(g, r, 'arch.friend')!;
    expect(takeRelationshipAction(g, r, npc.id, 'rel.compliment')).toBeNull();
    expect(g.relationships[0]!.stats['relationship']).toBe(60);
    expect(g.history.at(-1)?.text).toContain('Compliment');
  });

  it('rejects unknown npc / action / dead character', () => {
    const r = reg();
    const g = newGame(r);
    const npc = addRelationship(g, r, 'arch.friend')!;
    expect(takeRelationshipAction(g, r, 'rel.missing', 'rel.compliment')).toBe('no-npc');
    expect(takeRelationshipAction(g, r, npc.id, 'rel.nope')).toBe('no-action');
    g.character.alive = false;
    expect(takeRelationshipAction(g, r, npc.id, 'rel.compliment')).toBe('dead');
  });

  it('removeRelationship effect removes the targeted NPC', () => {
    const r = reg();
    const g = newGame(r);
    const npc = addRelationship(g, r, 'arch.friend')!;
    applyEffects([{ removeRelationship: true }], g, r, npc);
    expect(g.relationships).toHaveLength(0);
  });

  it('removeRelationship with no target NPC is a no-op', () => {
    const r = reg();
    const g = newGame(r);
    addRelationship(g, r, 'arch.friend');
    applyEffects([{ removeRelationship: true }], g, r); // no relTarget
    expect(g.relationships).toHaveLength(1);
  });

  it('excludes actions whose appliesTo does not match, and dead NPCs', () => {
    const r = reg();
    const g = newGame(r);
    const npc = addRelationship(g, r, 'arch.friend')!;
    // rel.partner-only targets partners, not friends.
    expect(relationshipActions(g, r, npc.id).map((a) => a.id)).not.toContain('rel.partner-only');
    npc.alive = false;
    expect(relationshipActions(g, r, npc.id)).toHaveLength(0);
  });
});
