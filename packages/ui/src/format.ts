/**
 * Pure presentational helpers — unit-tested independently of React Native so
 * the display logic is verified in CI without a native render pipeline.
 */

/** Fraction [0,1] of a stat's range, for rendering a progress bar width. */
export function statFraction(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const clamped = Math.min(max, Math.max(min, value));
  return (clamped - min) / (max - min);
}

/** Format a money amount as a short currency string. */
export function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs}`;
}

/** A coarse life-stage label from age, for section headers / flavor. */
export function lifeStage(age: number): string {
  if (age <= 2) return 'Baby';
  if (age <= 12) return 'Child';
  if (age <= 19) return 'Teen';
  if (age <= 64) return 'Adult';
  return 'Senior';
}
