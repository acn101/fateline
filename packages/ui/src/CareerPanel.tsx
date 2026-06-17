import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { CareerView } from '@fateline/store';
import { formatMoney } from './format.js';
import { useTheme } from './useTheme.js';

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
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      {view.current ? (
        <View style={styles.statusRow}>
          <Text style={[styles.status, { color: t.text }]}>
            {view.current.title} · {formatMoney(view.current.salary)}/yr
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Quit job" onPress={onQuit}>
            <Text style={[styles.quit, { color: t.danger }]}>Quit</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={[styles.muted, { color: t.faint }]}>Unemployed</Text>
      )}

      {view.enrolledIn ? (
        <Text style={[styles.status, { color: t.text }]}>
          Studying {view.enrolledIn.title} ({view.enrolledIn.yearsCompleted}/{view.enrolledIn.years}{' '}
          yrs)
        </Text>
      ) : null}

      {view.openPrograms.length > 0 ? (
        <>
          <Text style={[styles.label, { color: t.faint }]}>Enroll</Text>
          <View style={styles.chips}>
            {view.openPrograms.map((p) => (
              <Pressable
                key={p.id}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: t.successSoft, opacity: pressed ? 0.8 : 1 },
                ]}
                accessibilityRole="button"
                onPress={() => onEnroll(p.id)}
              >
                <Text style={[styles.chipText, { color: t.onSuccessSoft }]}>{p.title}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {view.openJobs.length > 0 ? (
        <>
          <Text style={[styles.label, { color: t.faint }]}>Apply for a job</Text>
          <View style={styles.chips}>
            {view.openJobs.map((c) => (
              <Pressable
                key={c.id}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: t.accentSoft, opacity: pressed ? 0.8 : 1 },
                ]}
                accessibilityRole="button"
                onPress={() => onApply(c.id)}
              >
                <Text style={[styles.chipText, { color: t.onAccentSoft }]}>{c.title}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontSize: 15, fontWeight: '600' },
  quit: { fontSize: 13, fontWeight: '600' },
  muted: { fontSize: 14, fontStyle: 'italic' },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 },
  chipText: { fontWeight: '600', fontSize: 13 },
});
