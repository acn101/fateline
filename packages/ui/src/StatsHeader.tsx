import { View, Text, StyleSheet } from 'react-native';
import { StatBar } from './StatBar.js';
import { formatMoney, lifeStage } from './format.js';
import type { DisplayStat } from '@fateline/store';
import type { GameState } from '@fateline/engine';

/**
 * Character header: name, age, life stage, money, and all visible stats.
 * Stats are passed in (computed by the store's visibleStats selector) so any
 * module's declared stat renders automatically — README §7 dynamic rendering.
 */
export function StatsHeader({ game, stats }: { game: GameState; stats: DisplayStat[] }) {
  const money = game.assets['money'] ?? 0;
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.name}>{game.character.name}</Text>
        <Text style={styles.meta}>
          Age {game.character.age} · {lifeStage(game.character.age)}
        </Text>
      </View>
      <Text style={styles.money}>{formatMoney(money)}</Text>
      <View style={styles.stats}>
        {stats.map((s) => (
          <StatBar key={s.id} stat={s} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, backgroundColor: '#ffffff', borderRadius: 12, gap: 8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 13, color: '#6b7280' },
  money: { fontSize: 16, fontWeight: '600', color: '#059669' },
  stats: { marginTop: 4 },
});
