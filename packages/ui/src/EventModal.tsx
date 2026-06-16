import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import type { PendingEvent } from '@fateline/engine';

/** Presents a pending event's title and choices (README §7 event modal). */
export function EventModal({
  pending,
  onChoose,
}: {
  pending: PendingEvent | null;
  onChoose: (choiceIndex: number) => void;
}) {
  return (
    <Modal visible={pending !== null} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {pending ? (
            <>
              <Text style={styles.title}>{pending.event.title}</Text>
              {pending.event.choices.map((choice, i) => (
                <Pressable
                  key={i}
                  style={styles.choice}
                  accessibilityRole="button"
                  onPress={() => onChoose(i)}
                >
                  <Text style={styles.choiceText}>{choice.text}</Text>
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
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 10,
  },
  title: { fontSize: 17, fontWeight: '600', color: '#111827', marginBottom: 6 },
  choice: { backgroundColor: '#eef2ff', borderRadius: 10, padding: 14 },
  choiceText: { fontSize: 15, color: '#3730a3', fontWeight: '500' },
});
