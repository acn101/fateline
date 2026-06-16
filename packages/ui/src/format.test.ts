import { describe, expect, it } from 'vitest';
import { statFraction, formatMoney, lifeStage } from './format.js';

describe('statFraction', () => {
  it('maps value to [0,1] across the range', () => {
    expect(statFraction(50, 0, 100)).toBe(0.5);
    expect(statFraction(0, 0, 100)).toBe(0);
    expect(statFraction(100, 0, 100)).toBe(1);
  });
  it('clamps out-of-range values', () => {
    expect(statFraction(-10, 0, 100)).toBe(0);
    expect(statFraction(999, 0, 100)).toBe(1);
  });
  it('handles negative-min ranges', () => {
    expect(statFraction(0, -100, 100)).toBe(0.5);
  });
  it('returns 0 for a degenerate range', () => {
    expect(statFraction(5, 10, 10)).toBe(0);
  });
});

describe('formatMoney', () => {
  it('formats plain, thousands, and millions', () => {
    expect(formatMoney(200)).toBe('$200');
    expect(formatMoney(1500)).toBe('$1.5K');
    expect(formatMoney(2_500_000)).toBe('$2.5M');
  });
  it('formats negatives', () => {
    expect(formatMoney(-1500)).toBe('-$1.5K');
  });
});

describe('lifeStage', () => {
  it('labels each age band', () => {
    expect(lifeStage(1)).toBe('Baby');
    expect(lifeStage(8)).toBe('Child');
    expect(lifeStage(16)).toBe('Teen');
    expect(lifeStage(30)).toBe('Adult');
    expect(lifeStage(80)).toBe('Senior');
  });
});
