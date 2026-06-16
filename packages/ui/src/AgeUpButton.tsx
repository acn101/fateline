import { Pressable, Text, StyleSheet } from 'react-native';

/** The primary "Age Up" action (README §7). Disabled when the character died. */
export function AgeUpButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={styles.text}>{disabled ? 'The End' : 'Age Up ▸'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: '#4f46e5', borderRadius: 12, padding: 16, alignItems: 'center' },
  disabled: { backgroundColor: '#9ca3af' },
  text: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
