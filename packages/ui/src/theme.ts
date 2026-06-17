/**
 * Theme tokens — a small, centralized palette so every component stays
 * consistent and the whole app flips between light and dark with the OS
 * setting. Pure data (no React Native import) so it is unit-testable; the
 * `useTheme()` hook that reads the OS scheme lives in `useTheme.ts`.
 */
export interface Theme {
  dark: boolean;
  /** App background (behind cards). */
  bg: string;
  /** Card / panel surface. */
  surface: string;
  /** Slightly raised or alternate surface (chips, tracks). */
  surfaceAlt: string;
  /** Primary text. */
  text: string;
  /** Secondary text. */
  muted: string;
  /** Faint text (labels, captions). */
  faint: string;
  /** Hairline borders / dividers. */
  border: string;
  /** Primary accent (buttons, active tab). */
  accent: string;
  /** Text/icon on top of the accent color. */
  onAccent: string;
  /** Soft accent background (accent chips). */
  accentSoft: string;
  /** On-soft-accent text. */
  onAccentSoft: string;
  /** Positive (gains, money up, health). */
  success: string;
  successSoft: string;
  onSuccessSoft: string;
  /** Negative (losses, danger). */
  danger: string;
  dangerSoft: string;
  onDangerSoft: string;
  /** Relationship/romance accent (pink). */
  romance: string;
  romanceSoft: string;
  onRomanceSoft: string;
}

const light: Theme = {
  dark: false,
  bg: '#f3f4f6',
  surface: '#ffffff',
  surfaceAlt: '#f1f5f9',
  text: '#111827',
  muted: '#6b7280',
  faint: '#9ca3af',
  border: '#e5e7eb',
  accent: '#4f46e5',
  onAccent: '#ffffff',
  accentSoft: '#eef2ff',
  onAccentSoft: '#3730a3',
  success: '#059669',
  successSoft: '#ecfdf5',
  onSuccessSoft: '#047857',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  onDangerSoft: '#b91c1c',
  romance: '#ec4899',
  romanceSoft: '#fce7f3',
  onRomanceSoft: '#9d174d',
};

const dark: Theme = {
  dark: true,
  bg: '#0b1120',
  surface: '#1e293b',
  surfaceAlt: '#334155',
  text: '#f1f5f9',
  muted: '#94a3b8',
  faint: '#64748b',
  border: '#334155',
  accent: '#818cf8',
  onAccent: '#0b1120',
  accentSoft: '#312e81',
  onAccentSoft: '#c7d2fe',
  success: '#34d399',
  successSoft: '#064e3b',
  onSuccessSoft: '#6ee7b7',
  danger: '#f87171',
  dangerSoft: '#450a0a',
  onDangerSoft: '#fca5a5',
  romance: '#f472b6',
  romanceSoft: '#500724',
  onRomanceSoft: '#fbcfe8',
};

export const themes = { light, dark };
