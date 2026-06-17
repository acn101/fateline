import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BirthCandidate, Gender } from '@fateline/engine';
import { useTheme } from '@fateline/ui';
import { gameStore, restoreAutosave } from '../src/gameSession';

type GenderChoice = Gender | 'any';

const GENDER_OPTIONS: { id: GenderChoice; label: string }[] = [
  { id: 'any', label: 'Surprise me' },
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'x', label: 'Nonbinary' },
];

const GENDER_LABEL: Record<Gender, string> = { female: 'Female', male: 'Male', x: 'Nonbinary' };

/** Home / New Life screen — character creation with a 3-candidate birth chooser. */
export default function NewLifeScreen() {
  const router = useRouter();
  const t = useTheme();
  const [hasSave, setHasSave] = useState(false);
  const [gender, setGender] = useState<GenderChoice>('any');
  const [candidates, setCandidates] = useState<BirthCandidate[]>([]);

  const roll = useCallback((g: GenderChoice) => {
    const seed = `birth-${Date.now()}-${Math.random()}`;
    setCandidates(gameStore.getState().rollCandidates(seed, 3, g === 'any' ? undefined : g));
  }, []);

  useEffect(() => {
    void restoreAutosave().then(setHasSave);
    roll('any');
  }, [roll]);

  const chooseGender = (g: GenderChoice) => {
    setGender(g);
    roll(g);
  };

  const beBorn = (c: BirthCandidate) => {
    gameStore.getState().startGame({
      seed: `${c.name}-${Date.now()}`,
      character: {
        name: c.name,
        gender: c.gender,
        ethnicity: c.ethnicity,
        country: c.country,
        birthplace: c.birthplace,
        birthYear: new Date().getFullYear(),
      },
      assets: { money: 0 },
    });
    router.push('/play');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={[styles.title, { color: t.accent }]}>Fateline</Text>
        <Text style={[styles.subtitle, { color: t.muted }]}>Choose a life to be born into.</Text>

        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map((opt) => {
            const active = gender === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[
                  styles.genderChip,
                  { backgroundColor: active ? t.accent : t.surface, borderColor: t.border },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => chooseGender(opt.id)}
              >
                <Text style={[styles.genderText, { color: active ? t.onAccent : t.muted }]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {candidates.map((c, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: t.surface, borderColor: t.border, opacity: pressed ? 0.85 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Be born as ${c.name}`}
            onPress={() => beBorn(c)}
          >
            <Text style={[styles.name, { color: t.text }]}>{c.name}</Text>
            <Text style={[styles.meta, { color: t.muted }]}>
              {GENDER_LABEL[c.gender]}
              {c.ethnicityLabel ? ` · ${c.ethnicityLabel}` : ''}
            </Text>
            <Text style={[styles.origin, { color: t.faint }]}>
              Born in {c.birthplace || 'parts unknown'}, {c.countryLabel}
            </Text>
          </Pressable>
        ))}

        <Pressable style={styles.reroll} accessibilityRole="button" onPress={() => roll(gender)}>
          <Text style={[styles.rerollText, { color: t.accent }]}>↻ Reroll</Text>
        </Pressable>

        {hasSave ? (
          <Pressable
            style={styles.secondary}
            accessibilityRole="button"
            onPress={() => router.push('/play')}
          >
            <Text style={[styles.secondaryText, { color: t.accent }]}>Continue current life</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.secondary}
          accessibilityRole="button"
          onPress={() => router.push('/mods')}
        >
          <Text style={[styles.secondaryText, { color: t.muted }]}>Manage Mods</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 24, gap: 12 },
  title: { fontSize: 42, fontWeight: '900', textAlign: 'center', marginTop: 12, letterSpacing: -1 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 8 },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  genderChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  genderText: { fontWeight: '600', fontSize: 13 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  name: { fontSize: 20, fontWeight: '700' },
  meta: { fontSize: 13 },
  origin: { fontSize: 13 },
  reroll: { alignItems: 'center', padding: 8 },
  rerollText: { fontWeight: '600' },
  secondary: { padding: 12, alignItems: 'center' },
  secondaryText: { fontSize: 15, fontWeight: '600' },
});
