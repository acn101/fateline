import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useTheme } from './useTheme.js';
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
  const t = useTheme();
  return (
    <ScrollView style={styles.feed} contentContainerStyle={styles.content}>
      {history.length === 0 ? (
        <Text style={[styles.empty, { color: t.faint }]}>Your story begins…</Text>
      ) : (
        history.map((entry, i) => (
          <View
            key={i}
            style={[styles.entry, { backgroundColor: t.surface, borderColor: t.border }]}
          >
            <Text style={[styles.age, { color: t.faint }]}>AGE {entry.age}</Text>
            <Text style={[styles.text, { color: t.text }]}>{entry.text}</Text>
            {entry.resultText ? (
              <Text style={[styles.result, { color: t.muted }]}>{entry.resultText}</Text>
            ) : null}
            {entry.deltas && entry.deltas.length > 0 ? (
              <View style={styles.deltas}>
                {entry.deltas.map((d, di) => {
                  const up = d.amount > 0;
                  return (
                    <Text
                      key={di}
                      style={[
                        styles.delta,
                        {
                          color: up ? t.onSuccessSoft : t.onDangerSoft,
                          backgroundColor: up ? t.successSoft : t.dangerSoft,
                        },
                      ]}
                    >
                      {formatDelta(d)}
                    </Text>
                  );
                })}
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
  content: { padding: 12, gap: 8 },
  empty: { fontStyle: 'italic', textAlign: 'center', marginTop: 24 },
  entry: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 3 },
  age: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  text: { fontSize: 14, fontWeight: '500' },
  result: { fontSize: 13 },
  deltas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  delta: {
    fontSize: 12,
    fontWeight: '700',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
});
