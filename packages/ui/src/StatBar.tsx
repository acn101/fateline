import { View, Text, StyleSheet } from 'react-native';
import { statFraction } from './format.js';
import { useTheme } from './useTheme.js';
import type { Theme } from './theme.js';
import type { DisplayStat } from '@fateline/store';

/** Color a stat bar by how full it is: low = danger, mid = accent, high = success. */
function barColor(fraction: number, t: Theme): string {
  if (fraction < 0.25) return t.danger;
  if (fraction < 0.6) return t.accent;
  return t.success;
}

/** A single labeled stat bar. Width is driven by the pure statFraction helper. */
export function StatBar({ stat }: { stat: DisplayStat }) {
  const t = useTheme();
  const fraction = statFraction(stat.value, stat.min, stat.max);
  return (
    <View style={styles.row} accessibilityLabel={`${stat.label}: ${stat.value}`}>
      <Text style={[styles.label, { color: t.muted }]}>{stat.label}</Text>
      <View style={[styles.track, { backgroundColor: t.surfaceAlt }]}>
        <View
          style={[
            styles.fill,
            { width: `${fraction * 100}%`, backgroundColor: barColor(fraction, t) },
          ]}
        />
      </View>
      <Text style={[styles.value, { color: t.text }]}>{Math.round(stat.value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  label: { width: 88, fontSize: 13 },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  value: { width: 32, textAlign: 'right', fontSize: 13, fontWeight: '600' },
});
