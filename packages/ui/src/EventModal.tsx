import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from './useTheme.js';
import type { PendingEvent } from '@fateline/engine';

/** Presents a pending event's title and choices (README §7 event modal). */
export function EventModal({
  pending,
  onChoose,
}: {
  pending: PendingEvent | null;
  onChoose: (choiceIndex: number) => void;
}) {
  const t = useTheme();
  return (
    <Modal visible={pending !== null} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: t.surface }]}>
          <View style={[styles.grabber, { backgroundColor: t.border }]} />
          {pending ? (
            <>
              <Text style={[styles.title, { color: t.text }]}>{pending.event.title}</Text>
              {pending.event.choices.map((choice, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    styles.choice,
                    { backgroundColor: t.accentSoft, opacity: pressed ? 0.8 : 1 },
                  ]}
                  accessibilityRole="button"
                  onPress={() => onChoose(i)}
                >
                  <Text style={[styles.choiceText, { color: t.onAccentSoft }]}>{choice.text}</Text>
                </Pressable>
              ))}
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, lineHeight: 24 },
  choice: { borderRadius: 12, padding: 16 },
  choiceText: { fontSize: 15, fontWeight: '600' },
});
