import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { AssetsView } from '@fateline/store';
import { formatMoney } from './format.js';
import { useTheme } from './useTheme.js';

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
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      {view.owned.length > 0 ? (
        view.owned.map(({ owned, label }) => (
          <View key={owned.id} style={styles.ownedRow}>
            <Text style={[styles.ownedLabel, { color: t.text }]}>
              {label} · {formatMoney(owned.value)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Sell ${label}`}
              onPress={() => onSell(owned.id)}
            >
              <Text style={[styles.sell, { color: t.danger }]}>Sell</Text>
            </Pressable>
          </View>
        ))
      ) : (
        <Text style={[styles.muted, { color: t.faint }]}>You own nothing of value.</Text>
      )}

      {view.buyable.length > 0 ? (
        <>
          <Text style={[styles.label, { color: t.faint }]}>Buy</Text>
          <View style={styles.chips}>
            {view.buyable.map((a) => (
              <Pressable
                key={a.id}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: t.surfaceAlt, opacity: pressed ? 0.8 : 1 },
                ]}
                accessibilityRole="button"
                onPress={() => onBuy(a.id)}
              >
                <Text style={[styles.chipText, { color: t.text }]}>{a.label}</Text>
                <Text style={[styles.price, { color: t.muted }]}>{formatMoney(a.price)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  ownedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ownedLabel: { fontSize: 14, fontWeight: '500' },
  sell: { fontSize: 13, fontWeight: '600' },
  muted: { fontSize: 14, fontStyle: 'italic' },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
  },
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
  price: { fontSize: 11 },
});
