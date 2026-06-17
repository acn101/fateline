import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { CareerView } from '@fateline/store';
import { formatMoney } from './format.js';

/**
 * Career & School panel (README §7, §4.5.3): current job/schooling status plus
 * open jobs to apply to and programs to enroll in.
 */
export function CareerPanel({
  view,
  onApply,
  onQuit,
  onEnroll,
}: {
  view: CareerView;
  onApply: (careerId: string) => void;
  onQuit: () => void;
  onEnroll: (programId: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Career & School</Text>

      {view.current ? (
        <View style={styles.statusRow}>
          <Text style={styles.status}>
            {view.current.title} · {formatMoney(view.current.salary)}/yr
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Quit job" onPress={onQuit}>
            <Text style={styles.quit}>Quit</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.muted}>Unemployed</Text>
      )}

      {view.enrolledIn ? (
        <Text style={styles.status}>
          Studying {view.enrolledIn.title} ({view.enrolledIn.yearsCompleted}/{view.enrolledIn.years}{' '}
          yrs)
        </Text>
      ) : null}

      {view.openPrograms.length > 0 ? (
        <>
          <Text style={styles.label}>Enroll</Text>
          <View style={styles.chips}>
            {view.openPrograms.map((p) => (
              <Pressable
                key={p.id}
                style={styles.eduChip}
                accessibilityRole="button"
                onPress={() => onEnroll(p.id)}
              >
                <Text style={styles.eduChipText}>{p.title}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {view.openJobs.length > 0 ? (
        <>
          <Text style={styles.label}>Apply for a job</Text>
          <View style={styles.chips}>
            {view.openJobs.map((c) => (
              <Pressable
                key={c.id}
                style={styles.jobChip}
                accessibilityRole="button"
                onPress={() => onApply(c.id)}
              >
                <Text style={styles.jobChipText}>{c.title}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  heading: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontSize: 14, color: '#111827', fontWeight: '600' },
  quit: { fontSize: 13, color: '#dc2626', fontWeight: '600' },
  muted: { fontSize: 14, color: '#9ca3af', fontStyle: 'italic' },
  label: { fontSize: 12, fontWeight: '600', color: '#9ca3af', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  eduChip: {
    backgroundColor: '#ecfdf5',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  eduChipText: { color: '#047857', fontWeight: '600', fontSize: 12 },
  jobChip: {
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  jobChipText: { color: '#1d4ed8', fontWeight: '600', fontSize: 12 },
});
