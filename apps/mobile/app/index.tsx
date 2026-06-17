import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BirthCandidate, Gender } from '@fateline/engine';
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Fateline</Text>
        <Text style={styles.subtitle}>Choose a life to be born into.</Text>

        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              style={[styles.genderChip, gender === opt.id && styles.genderChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: gender === opt.id }}
              onPress={() => chooseGender(opt.id)}
            >
              <Text style={[styles.genderText, gender === opt.id && styles.genderTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {candidates.map((c, i) => (
          <Pressable
            key={i}
            style={styles.card}
            accessibilityRole="button"
            accessibilityLabel={`Be born as ${c.name}`}
            onPress={() => beBorn(c)}
          >
            <Text style={styles.name}>{c.name}</Text>
            <Text style={styles.meta}>
              {GENDER_LABEL[c.gender]}
              {c.ethnicityLabel ? ` · ${c.ethnicityLabel}` : ''}
            </Text>
            <Text style={styles.origin}>
              Born in {c.birthplace || 'parts unknown'}, {c.countryLabel}
            </Text>
          </Pressable>
        ))}

        <Pressable style={styles.reroll} accessibilityRole="button" onPress={() => roll(gender)}>
          <Text style={styles.rerollText}>↻ Reroll</Text>
        </Pressable>

        {hasSave ? (
          <Pressable
            style={styles.secondary}
            accessibilityRole="button"
            onPress={() => router.push('/play')}
          >
            <Text style={styles.secondaryText}>Continue current life</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.secondary}
          accessibilityRole="button"
          onPress={() => router.push('/mods')}
        >
          <Text style={styles.secondaryText}>Manage Mods</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  inner: { padding: 24, gap: 12 },
  title: { fontSize: 40, fontWeight: '800', color: '#312e81', textAlign: 'center', marginTop: 12 },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 8 },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  genderChip: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  genderChipActive: { backgroundColor: '#4f46e5' },
  genderText: { color: '#4f46e5', fontWeight: '600', fontSize: 13 },
  genderTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 2 },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 13, color: '#6b7280' },
  origin: { fontSize: 13, color: '#9ca3af' },
  reroll: { alignItems: 'center', padding: 8 },
  rerollText: { color: '#4f46e5', fontWeight: '600' },
  secondary: { padding: 12, alignItems: 'center' },
  secondaryText: { color: '#4f46e5', fontSize: 15, fontWeight: '600' },
});
