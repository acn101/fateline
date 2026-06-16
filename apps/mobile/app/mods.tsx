import { useState, useCallback } from 'react';
import { Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { fromPaste, fromGithub, installMod } from '@fateline/mod-loader';
import { modStore, refreshSession, useInstalledIds } from '../src/gameSession';

/**
 * Mods screen (README §7): list installed mods and add new ones via the
 * paste and GitHub-link sources. (File upload + registry browse build on the
 * same installMod pipeline; added with native pickers later.)
 */
export default function ModsScreen() {
  const router = useRouter();
  const installed = useInstalledIds();
  const [paste, setPaste] = useState('');
  const [github, setGithub] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const handleInstall = useCallback(async (acquire: () => Promise<void> | void) => {
    setStatus('Installing…');
    try {
      await acquire();
      await refreshSession();
      setStatus('Installed ✓');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const installPaste = () =>
    handleInstall(async () => {
      const result = await installMod(fromPaste(paste), modStore);
      if (!result.ok) throw new Error(result.errors.map((e) => e.message).join('; '));
      setPaste('');
    });

  const installGithub = () =>
    handleInstall(async () => {
      const result = await installMod(await fromGithub(github), modStore);
      if (!result.ok) throw new Error(result.errors.map((e) => e.message).join('; '));
      setGithub('');
    });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Mods</Text>

        <Text style={styles.section}>Installed</Text>
        {installed.length === 0 ? (
          <Text style={styles.muted}>No mods installed yet.</Text>
        ) : (
          installed.map((id) => (
            <Text key={id} style={styles.item}>
              • {id}
            </Text>
          ))
        )}

        <Text style={styles.section}>Add from GitHub</Text>
        <TextInput
          style={styles.input}
          placeholder="https://github.com/owner/repo"
          autoCapitalize="none"
          value={github}
          onChangeText={setGithub}
          accessibilityLabel="GitHub URL"
        />
        <Pressable style={styles.button} accessibilityRole="button" onPress={installGithub}>
          <Text style={styles.buttonText}>Install from GitHub</Text>
        </Pressable>

        <Text style={styles.section}>Paste YAML</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Paste a mod's YAML here"
          multiline
          value={paste}
          onChangeText={setPaste}
          accessibilityLabel="Mod YAML"
        />
        <Pressable style={styles.button} accessibilityRole="button" onPress={installPaste}>
          <Text style={styles.buttonText}>Install from paste</Text>
        </Pressable>

        {status ? <Text style={styles.status}>{status}</Text> : null}

        <Pressable style={styles.link} accessibilityRole="button" onPress={() => router.back()}>
          <Text style={styles.linkText}>Done</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 20, gap: 8 },
  heading: { fontSize: 28, fontWeight: '800', color: '#111827' },
  section: { fontSize: 15, fontWeight: '700', color: '#374151', marginTop: 16 },
  muted: { color: '#9ca3af', fontStyle: 'italic' },
  item: { color: '#111827', fontSize: 14 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 14 },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  button: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  status: { marginTop: 12, color: '#374151' },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#4f46e5', fontWeight: '600' },
});
