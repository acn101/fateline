import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { AssetsView } from '@fateline/store';
import { formatMoney } from './format.js';

/**
 * Assets panel (README §7, §4.5.4): owned assets (sellable at current value)
 * and assets currently affordable to buy.
 */
export function AssetsPanel({
  view,
  onBuy,
  onSell,
}: {
  view: AssetsView;
  onBuy: (assetTypeId: string) => void;
  onSell: (ownedId: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Assets</Text>

      {view.owned.length > 0 ? (
        view.owned.map(({ owned, label }) => (
          <View key={owned.id} style={styles.ownedRow}>
            <Text style={styles.ownedLabel}>
              {label} · {formatMoney(owned.value)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Sell ${label}`}
              onPress={() => onSell(owned.id)}
            >
              <Text style={styles.sell}>Sell</Text>
            </Pressable>
          </View>
        ))
      ) : (
        <Text style={styles.muted}>You own nothing of value.</Text>
      )}

      {view.buyable.length > 0 ? (
        <>
          <Text style={styles.label}>Buy</Text>
          <View style={styles.chips}>
            {view.buyable.map((a) => (
              <Pressable
                key={a.id}
                style={styles.chip}
                accessibilityRole="button"
                onPress={() => onBuy(a.id)}
              >
                <Text style={styles.chipText}>{a.label}</Text>
                <Text style={styles.price}>{formatMoney(a.price)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  heading: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  ownedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ownedLabel: { fontSize: 14, color: '#111827' },
  sell: { fontSize: 13, color: '#dc2626', fontWeight: '600' },
  muted: { fontSize: 14, color: '#9ca3af', fontStyle: 'italic' },
  label: { fontSize: 12, fontWeight: '600', color: '#9ca3af', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: { color: '#92400e', fontWeight: '600', fontSize: 12 },
  price: { color: '#b45309', fontSize: 11 },
});
