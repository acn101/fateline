import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { RelationshipView } from '@fateline/store';
import { statFraction } from './format.js';
import { useTheme } from './useTheme.js';

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
  const t = useTheme();
  if (views.length === 0) {
    return <Text style={[styles.empty, { color: t.faint }]}>You have no relationships yet.</Text>;
  }
  return (
    <View style={styles.wrap}>
      {views.map(({ npc, actions }) => {
        const closeness = npc.stats['relationship'] ?? 0;
        return (
          <View
            key={npc.id}
            style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}
          >
            <View style={styles.row}>
              <Text style={[styles.name, { color: t.text }]}>{npc.name}</Text>
              <Text style={[styles.type, { color: t.faint }]}>{npc.type}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: t.surfaceAlt }]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${statFraction(closeness, 0, 100) * 100}%`,
                    backgroundColor: t.romance,
                  },
                ]}
              />
            </View>
            <View style={styles.actions}>
              {actions.map((action) => (
                <Pressable
                  key={action.id}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: t.romanceSoft, opacity: pressed ? 0.8 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${action.label} ${npc.name}`}
                  onPress={() => onInteract(npc.id, action.id)}
                >
                  <Text style={[styles.chipText, { color: t.onRomanceSoft }]}>{action.label}</Text>
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
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { fontSize: 15, fontWeight: '700' },
  type: { fontSize: 12, textTransform: 'capitalize' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  chipText: { fontWeight: '600', fontSize: 12 },
  empty: { fontStyle: 'italic', textAlign: 'center', marginTop: 12 },
});
