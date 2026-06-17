import { describe, expect, it } from 'vitest';
import { themes } from './theme.js';

describe('themes', () => {
  it('exposes light and dark palettes', () => {
    expect(themes.light.dark).toBe(false);
    expect(themes.dark.dark).toBe(true);
  });

  it('both palettes define every token (no undefined colors)', () => {
    const keys = Object.keys(themes.light) as (keyof typeof themes.light)[];
    for (const key of keys) {
      expect(themes.light[key], `light.${key}`).toBeDefined();
      expect(themes.dark[key], `dark.${key}`).toBeDefined();
    }
    // The two palettes must cover the same token set.
    expect(Object.keys(themes.dark).sort()).toEqual(keys.sort());
  });

  it('light and dark differ on background and text for real contrast', () => {
    expect(themes.light.bg).not.toBe(themes.dark.bg);
    expect(themes.light.text).not.toBe(themes.dark.text);
  });
});
