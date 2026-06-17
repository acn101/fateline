import { useColorScheme } from 'react-native';
import { themes, type Theme } from './theme.js';

/** Returns the active theme based on the OS color scheme (system-aware). */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? themes.dark : themes.light;
}
