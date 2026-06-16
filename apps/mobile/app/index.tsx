import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gameStore } from '../src/gameSession';

/** Home / New Life screen (README §7). */
export default function NewLifeScreen() {
  const router = useRouter();
  const [name, setName] = useState('');

  const start = () => {
    gameStore.getState().startGame({
      seed: `${name || 'Anon'}-${Date.now()}`,
      character: {
        name: name || 'Anonymous',
        gender: 'unspecified',
        birthYear: new Date().getFullYear(),
      },
      assets: { money: 0 },
    });
    router.push('/play');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Fateline</Text>
        <Text style={styles.subtitle}>An open, moddable life simulator.</Text>
        <TextInput
          style={styles.input}
          placeholder="Name your character"
          value={name}
          onChangeText={setName}
          accessibilityLabel="Character name"
        />
        <Pressable style={styles.button} accessibilityRole="button" onPress={start}>
          <Text style={styles.buttonText}>Begin a New Life</Text>
        </Pressable>
        <Pressable
          style={styles.secondary}
          accessibilityRole="button"
          onPress={() => router.push('/modules')}
        >
          <Text style={styles.secondaryText}>Manage Modules</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  inner: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 40, fontWeight: '800', color: '#312e81', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 16 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16 },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondary: { padding: 14, alignItems: 'center' },
  secondaryText: { color: '#4f46e5', fontSize: 15, fontWeight: '600' },
});
