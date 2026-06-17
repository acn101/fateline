import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from './useTheme.js';

/** The primary "Age Up" action (README §7). Disabled when the character died. */
export function AgeUpButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: disabled ? t.faint : t.accent,
          opacity: pressed && !disabled ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={[styles.text, { color: t.onAccent }]}>{disabled ? 'The End' : 'Age Up  ▸'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  text: { fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});
