import { ScrollView, View, Text, StyleSheet } from 'react-native';
import type { HistoryEntry } from '@fateline/engine';

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
});
