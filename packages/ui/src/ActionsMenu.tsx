import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { ActionGroup } from '@fateline/store';
import { formatMoney } from './format.js';

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
  if (groups.length === 0) {
    return <Text style={styles.empty}>No activities available right now.</Text>;
  }
  return (
    <View style={styles.wrap}>
      {groups.map((group) => (
        <View key={group.category} style={styles.group}>
          <Text style={styles.category}>{group.category}</Text>
          <View style={styles.chips}>
            {group.actions.map((action) => {
              const moneyCost = action.cost?.['money'];
              return (
                <Pressable
                  key={action.id}
                  style={styles.chip}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  onPress={() => onAct(action.id)}
                >
                  <Text style={styles.chipText}>{action.label}</Text>
                  {moneyCost ? <Text style={styles.cost}>{formatMoney(moneyCost)}</Text> : null}
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
  wrap: { gap: 12 },
  group: { gap: 6 },
  category: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'capitalize' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: { color: '#3730a3', fontWeight: '600', fontSize: 13 },
  cost: { color: '#9ca3af', fontSize: 11 },
  empty: { color: '#9ca3af', fontStyle: 'italic', textAlign: 'center' },
});
