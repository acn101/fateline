import { ScrollView, View, Text, StyleSheet } from 'react-native';
import type { HistoryEntry, Delta } from '@fateline/engine';

function formatDelta(d: Delta): string {
  const sign = d.amount > 0 ? '+' : '';
  if (d.label === '$') {
    const abs = Math.abs(d.amount);
    const money = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}K` : `$${abs}`;
    return `${d.amount < 0 ? '-' : '+'}${money}`;
  }
  return `${sign}${d.amount} ${d.label}`;
}

/** The scrollable life-story feed (README §7). Newest entries at the bottom. */
export function HistoryFeed({ history }: { history: HistoryEntry[] }) {
  return (
    <ScrollView style={styles.feed} contentContainerStyle={styles.content}>
      {history.length === 0 ? (
        <Text style={styles.empty}>Your story begins…</Text>
      ) : (
        history.map((entry, i) => (
          <View key={i} style={styles.entry}>
            <Text style={styles.age}>Age {entry.age}</Text>
            <Text style={styles.text}>{entry.text}</Text>
            {entry.resultText ? <Text style={styles.result}>{entry.resultText}</Text> : null}
            {entry.deltas && entry.deltas.length > 0 ? (
              <View style={styles.deltas}>
                {entry.deltas.map((d, di) => (
                  <Text
                    key={di}
                    style={[styles.delta, d.amount > 0 ? styles.deltaUp : styles.deltaDown]}
                  >
                    {formatDelta(d)}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  feed: { flex: 1 },
  content: { padding: 12, gap: 10 },
  empty: { color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', marginTop: 24 },
  entry: { backgroundColor: '#ffffff', borderRadius: 10, padding: 12, gap: 2 },
  age: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  text: { fontSize: 14, color: '#111827' },
  result: { fontSize: 13, color: '#4b5563' },
  deltas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  delta: {
    fontSize: 12,
    fontWeight: '700',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  deltaUp: { color: '#047857', backgroundColor: '#ecfdf5' },
  deltaDown: { color: '#b91c1c', backgroundColor: '#fef2f2' },
});
