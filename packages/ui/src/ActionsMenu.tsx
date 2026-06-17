import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { ActionGroup } from '@fateline/store';
import { formatMoney } from './format.js';
import { useTheme } from './useTheme.js';

/**
 * The Activities menu (README §7, §4.5.1): available actions grouped by
 * category. Tapping an action takes it via `onAct`. Cost is shown when present.
 */
export function ActionsMenu({
  groups,
  onAct,
}: {
  groups: ActionGroup[];
  onAct: (actionId: string) => void;
}) {
  const t = useTheme();
  if (groups.length === 0) {
    return (
      <Text style={[styles.empty, { color: t.faint }]}>No activities available right now.</Text>
    );
  }
  return (
    <View style={styles.wrap}>
      {groups.map((group) => (
        <View key={group.category} style={styles.group}>
          <Text style={[styles.category, { color: t.faint }]}>{group.category}</Text>
          <View style={styles.chips}>
            {group.actions.map((action) => {
              const moneyCost = action.cost?.['money'];
              return (
                <Pressable
                  key={action.id}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: t.accentSoft, opacity: pressed ? 0.8 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  onPress={() => onAct(action.id)}
                >
                  <Text style={[styles.chipText, { color: t.onAccentSoft }]}>{action.label}</Text>
                  {moneyCost ? (
                    <Text style={[styles.cost, { color: t.muted }]}>{formatMoney(moneyCost)}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  group: { gap: 8 },
  category: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  chipText: { fontWeight: '600', fontSize: 13 },
  cost: { fontSize: 11 },
  empty: { fontStyle: 'italic', textAlign: 'center', marginTop: 12 },
});
