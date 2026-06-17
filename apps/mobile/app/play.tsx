import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  visibleStats,
  actionMenu,
  relationshipViews,
  careerView,
  assetsView,
  identityLine,
} from '@fateline/store';
import {
  StatsHeader,
  HistoryFeed,
  EventModal,
  AgeUpButton,
  ActionsMenu,
  RelationshipsPanel,
  CareerPanel,
  AssetsPanel,
  useTheme,
} from '@fateline/ui';
import { useGame, gameStore } from '../src/gameSession';

type TabId = 'activities' | 'career' | 'assets' | 'people';
const TABS: { id: TabId; label: string }[] = [
  { id: 'activities', label: 'Activities' },
  { id: 'career', label: 'Career' },
  { id: 'assets', label: 'Assets' },
  { id: 'people', label: 'People' },
];

/** Main game screen (README §7): header, life feed, tabbed panel, Age Up. */
export default function PlayScreen() {
  const router = useRouter();
  const t = useTheme();
  const registry = useGame((s) => s.registry);
  const game = useGame((s) => s.game);
  const pending = useGame((s) => s.pending);
  const [tab, setTab] = useState<TabId>('activities');

  if (!registry || !game) {
    router.replace('/');
    return null;
  }

  const stats = visibleStats(registry, game);
  const alive = game.character.alive;
  const store = gameStore.getState();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={styles.header}>
        <StatsHeader game={game} stats={stats} subtitle={identityLine(registry, game)} />
      </View>

      <HistoryFeed history={game.history} />

      {alive ? (
        <View style={[styles.panel, { backgroundColor: t.surface, borderColor: t.border }]}>
          <ScrollView contentContainerStyle={styles.panelContent}>
            {tab === 'activities' ? (
              <ActionsMenu groups={actionMenu(registry, game)} onAct={(id) => store.act(id)} />
            ) : null}
            {tab === 'career' ? (
              <CareerPanel
                view={careerView(registry, game)}
                onApply={(id) => store.applyJob(id)}
                onQuit={() => store.quitJob()}
                onEnroll={(id) => store.enroll(id)}
              />
            ) : null}
            {tab === 'assets' ? (
              <AssetsPanel
                view={assetsView(registry, game)}
                onBuy={(id) => store.buy(id)}
                onSell={(id) => store.sell(id)}
              />
            ) : null}
            {tab === 'people' ? (
              <RelationshipsPanel
                views={relationshipViews(registry, game)}
                onInteract={(npcId, actionId) => store.interact(npcId, actionId)}
              />
            ) : null}
          </ScrollView>

          <View style={[styles.tabBar, { borderTopColor: t.border }]}>
            {TABS.map((tabItem) => {
              const active = tab === tabItem.id;
              return (
                <Pressable
                  key={tabItem.id}
                  style={styles.tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setTab(tabItem.id)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: active ? t.accent : t.faint, fontWeight: active ? '800' : '600' },
                    ]}
                  >
                    {tabItem.label}
                  </Text>
                  {active ? <View style={[styles.tabDot, { backgroundColor: t.accent }]} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <Text style={[styles.epitaph, { color: t.muted }]}>
          Your story has ended.{game.ribbon ? `  🎗 ${game.ribbon.label}` : ''}
        </Text>
      )}

      <View style={styles.footer}>
        {alive ? (
          <AgeUpButton onPress={() => store.advance()} />
        ) : (
          <AgeUpButton disabled onPress={() => router.replace('/')} />
        )}
      </View>

      <EventModal pending={pending} onChoose={(i) => store.choose(i)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, paddingBottom: 0 },
  panel: {
    maxHeight: 260,
    margin: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  panelContent: { padding: 14 },
  tabBar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 4 },
  tabText: { fontSize: 12 },
  tabDot: { width: 4, height: 4, borderRadius: 2 },
  epitaph: { textAlign: 'center', fontStyle: 'italic', padding: 20 },
  footer: { paddingHorizontal: 12, paddingBottom: 12 },
});
