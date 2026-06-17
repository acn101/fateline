import { View, Text, StyleSheet } from 'react-native';
import { StatBar } from './StatBar.js';
import { formatMoney, lifeStage } from './format.js';
import { useTheme } from './useTheme.js';
import type { DisplayStat } from '@fateline/store';
import type { GameState } from '@fateline/engine';

/**
 * Character header: name, age, life stage, money, and all visible stats.
 * Stats are passed in (computed by the store's visibleStats selector) so any
 * mod's declared stat renders automatically — README §7 dynamic rendering.
 */
export function StatsHeader({
  game,
  stats,
  subtitle,
}: {
  game: GameState;
  stats: DisplayStat[];
  /** Optional identity line, e.g. "Female · East Asian · Tokyo, Japan". */
  subtitle?: string;
}) {
  const t = useTheme();
  const money = game.assets['money'] ?? 0;
  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {game.character.name}
        </Text>
        <Text style={[styles.meta, { color: t.muted }]}>
          Age {game.character.age} · {lifeStage(game.character.age)}
        </Text>
      </View>
      {subtitle ? <Text style={[styles.subtitle, { color: t.faint }]}>{subtitle}</Text> : null}
      <Text style={[styles.money, { color: money < 0 ? t.danger : t.success }]}>
        {formatMoney(money)}
      </Text>
      <View style={styles.stats}>
        {stats.map((s) => (
          <StatBar key={s.id} stat={s} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  name: { fontSize: 22, fontWeight: '800', flexShrink: 1 },
  meta: { fontSize: 13 },
  subtitle: { fontSize: 12 },
  money: { fontSize: 16, fontWeight: '700' },
  stats: { marginTop: 6 },
});
