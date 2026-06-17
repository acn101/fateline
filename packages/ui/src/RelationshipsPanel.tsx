import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { RelationshipView } from '@fateline/store';
import { statFraction } from './format.js';

/**
 * Relationships panel (README §7, §4.5.2): each living NPC with a closeness bar
 * and the interactions available on them. Tapping an interaction runs it.
 */
export function RelationshipsPanel({
  views,
  onInteract,
}: {
  views: RelationshipView[];
  onInteract: (npcId: string, actionId: string) => void;
}) {
  if (views.length === 0) {
    return <Text style={styles.empty}>You have no relationships yet.</Text>;
  }
  return (
    <View style={styles.wrap}>
      {views.map(({ npc, actions }) => {
        const closeness = npc.stats['relationship'] ?? 0;
        return (
          <View key={npc.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{npc.name}</Text>
              <Text style={styles.type}>{npc.type}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${statFraction(closeness, 0, 100) * 100}%` }]} />
            </View>
            <View style={styles.actions}>
              {actions.map((action) => (
                <Pressable
                  key={action.id}
                  style={styles.chip}
                  accessibilityRole="button"
                  accessibilityLabel={`${action.label} ${npc.name}`}
                  onPress={() => onInteract(npc.id, action.id)}
                >
                  <Text style={styles.chipText}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  card: { backgroundColor: '#ffffff', borderRadius: 10, padding: 12, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  type: { fontSize: 12, color: '#9ca3af', textTransform: 'capitalize' },
  track: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#ec4899', borderRadius: 3 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: '#fce7f3',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: { color: '#9d174d', fontWeight: '600', fontSize: 12 },
  empty: { color: '#9ca3af', fontStyle: 'italic', textAlign: 'center' },
});
