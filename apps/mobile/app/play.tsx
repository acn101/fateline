import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { visibleStats, actionMenu, relationshipViews } from '@fateline/store';
import {
  StatsHeader,
  HistoryFeed,
  EventModal,
  AgeUpButton,
  ActionsMenu,
  RelationshipsPanel,
} from '@fateline/ui';
import { useGame } from '../src/gameSession';
import { gameStore } from '../src/gameSession';

/** Main game screen (README §7): stats header, history feed, actions, Age Up. */
export default function PlayScreen() {
  const router = useRouter();
  const registry = useGame((s) => s.registry);
  const game = useGame((s) => s.game);
  const pending = useGame((s) => s.pending);

  if (!registry || !game) {
    // No session in progress (e.g. deep-linked); go start one.
    router.replace('/');
    return null;
  }

  const stats = visibleStats(registry, game);
  const alive = game.character.alive;
  const groups = alive ? actionMenu(registry, game) : [];
  const relationships = alive ? relationshipViews(registry, game) : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <StatsHeader game={game} stats={stats} />
      </View>

      <HistoryFeed history={game.history} />

      <ScrollView style={styles.actions} contentContainerStyle={styles.actionsContent}>
        <ActionsMenu groups={groups} onAct={(id) => gameStore.getState().act(id)} />
        <RelationshipsPanel
          views={relationships}
          onInteract={(npcId, actionId) => gameStore.getState().interact(npcId, actionId)}
        />
      </ScrollView>

      <View style={styles.footer}>
        {game.character.alive ? null : <Text style={styles.epitaph}>Your story has ended.</Text>}
        <AgeUpButton
          disabled={!game.character.alive}
          onPress={() => gameStore.getState().advance()}
        />
      </View>

      <EventModal pending={pending} onChoose={(i) => gameStore.getState().choose(i)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { padding: 12 },
  actions: { maxHeight: 280 },
  actionsContent: { padding: 12, gap: 16 },
  footer: { padding: 12, gap: 8 },
  epitaph: { textAlign: 'center', color: '#6b7280', fontStyle: 'italic' },
});
