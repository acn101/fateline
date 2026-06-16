import { View, Text, StyleSheet } from 'react-native';
import { statFraction } from './format.js';
import type { DisplayStat } from '@fateline/store';

/** A single labeled stat bar. Width is driven by the pure statFraction helper. */
export function StatBar({ stat }: { stat: DisplayStat }) {
  const fraction = statFraction(stat.value, stat.min, stat.max);
  return (
    <View style={styles.row} accessibilityLabel={`${stat.label}: ${stat.value}`}>
      <Text style={styles.label}>{stat.label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
      </View>
      <Text style={styles.value}>{Math.round(stat.value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  label: { width: 88, fontSize: 13, color: '#374151' },
  track: { flex: 1, height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#10b981', borderRadius: 5 },
  value: { width: 32, textAlign: 'right', fontSize: 13, color: '#111827' },
});
