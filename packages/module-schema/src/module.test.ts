import { describe, expect, it } from 'vitest';
import { validateModule } from './validate.js';

const manifest = {
  id: 'com.author.test',
  name: 'Test Module',
  version: '1.0.0',
  engineVersion: '>=1.0.0',
  author: 'Tester',
};

function mod(events: unknown[], stats: unknown[] = []) {
  return { manifest, content: { stats, events } };
}

const wallet = {
  id: 'evt.found-wallet',
  category: 'random',
  weight: 10,
  conditions: [
    { stat: 'age', op: '>=', value: 6 },
    { flag: 'in_jail', op: '==', value: false },
  ],
  title: 'You found a wallet on the sidewalk.',
  choices: [
    {
      text: 'Keep the money',
      outcomes: [
        {
          weight: 70,
          effects: [
            { asset: 'money', op: '+', value: 200 },
            { stat: 'happiness', op: '+', value: 5 },
          ],
          resultText: 'You pocketed $200.',
        },
      ],
    },
  ],
};

describe('validateModule — happy path', () => {
  it('accepts the README §5.3 example event and applies defaults', () => {
    const result = validateModule(mod([wallet]));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const event = result.value.content.events[0]!;
      expect(event.once).toBe(false);
      expect(event.cooldownYears).toBe(0);
      expect(event.choices[0]!.outcomes[0]!.weight).toBe(70);
    }
  });

  it('accepts a declared stat with exposeAs', () => {
    const result = validateModule(
      mod(
        [],
        [{ id: 'karma', label: 'Karma', min: -100, max: 100, default: 0, exposeAs: 'karma' }],
      ),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.content.stats[0]!.showInUI).toBe(true);
  });
});

describe('validateModule — adversarial (README §5.4)', () => {
  it('rejects a negative outcome weight', () => {
    const bad = structuredClone(wallet);
    bad.choices[0]!.outcomes[0]!.weight = -5;
    expect(validateModule(mod([bad])).ok).toBe(false);
  });

  it('rejects unknown keys (no silent ignore)', () => {
    const bad = { ...wallet, sneaky: true };
    expect(validateModule(mod([bad])).ok).toBe(false);
  });

  it('rejects a triggerEvent pointing at an unknown id', () => {
    const bad = structuredClone(wallet);
    bad.choices[0]!.outcomes[0]!.effects.push({ triggerEvent: 'evt.nope' } as never);
    const result = validateModule(mod([bad]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.message.includes('unknown event id'))).toBe(true);
    }
  });

  it('detects an infinite trigger loop (cycle)', () => {
    const a = structuredClone(wallet);
    a.id = 'evt.a';
    a.choices[0]!.outcomes[0]!.effects = [{ triggerEvent: 'evt.b' } as never];
    const b = structuredClone(wallet);
    b.id = 'evt.b';
    b.choices[0]!.outcomes[0]!.effects = [{ triggerEvent: 'evt.a' } as never];
    const result = validateModule(mod([a, b]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.message.includes('Infinite trigger loop'))).toBe(true);
    }
  });

  it('rejects duplicate event ids', () => {
    const result = validateModule(mod([wallet, structuredClone(wallet)]));
    expect(result.ok).toBe(false);
  });

  it('rejects a stat whose default is out of range', () => {
    const result = validateModule(
      mod([], [{ id: 'karma', label: 'Karma', min: 0, max: 10, default: 99 }]),
    );
    expect(result.ok).toBe(false);
  });

  it('never throws on garbage input', () => {
    expect(validateModule(null).ok).toBe(false);
    expect(validateModule([1, 2, 3]).ok).toBe(false);
    expect(validateModule('module').ok).toBe(false);
  });
});
