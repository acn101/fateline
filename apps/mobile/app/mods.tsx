import { useState, useCallback } from 'react';
import { Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { fromPaste, fromGithub, installMod } from '@fateline/mod-loader';
import { useTheme } from '@fateline/ui';
import { modStore, refreshSession, useInstalledIds } from '../src/gameSession';

/**
 * Mods screen (README §7): list installed mods and add new ones via the
 * paste and GitHub-link sources. (File upload + registry browse build on the
 * same installMod pipeline; added with native pickers later.)
 */
export default function ModsScreen() {
  const router = useRouter();
  const t = useTheme();
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
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.heading, { color: t.text }]}>Mods</Text>

        <Text style={[styles.section, { color: t.muted }]}>Installed</Text>
        {installed.length === 0 ? (
          <Text style={[styles.muted, { color: t.faint }]}>No mods installed yet.</Text>
        ) : (
          installed.map((id) => (
            <Text key={id} style={[styles.item, { color: t.text }]}>
              • {id}
            </Text>
          ))
        )}

        <Text style={[styles.section, { color: t.muted }]}>Add from GitHub</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: t.surface, color: t.text, borderColor: t.border },
          ]}
          placeholder="https://github.com/owner/repo"
          placeholderTextColor={t.faint}
          autoCapitalize="none"
          value={github}
          onChangeText={setGithub}
          accessibilityLabel="GitHub URL"
        />
        <Pressable
          style={[styles.button, { backgroundColor: t.accent }]}
          accessibilityRole="button"
          onPress={installGithub}
        >
          <Text style={[styles.buttonText, { color: t.onAccent }]}>Install from GitHub</Text>
        </Pressable>

        <Text style={[styles.section, { color: t.muted }]}>Paste YAML</Text>
        <TextInput
          style={[
            styles.input,
            styles.multiline,
            { backgroundColor: t.surface, color: t.text, borderColor: t.border },
          ]}
          placeholder="Paste a mod's YAML here"
          placeholderTextColor={t.faint}
          multiline
          value={paste}
          onChangeText={setPaste}
          accessibilityLabel="Mod YAML"
        />
        <Pressable
          style={[styles.button, { backgroundColor: t.accent }]}
          accessibilityRole="button"
          onPress={installPaste}
        >
          <Text style={[styles.buttonText, { color: t.onAccent }]}>Install from paste</Text>
        </Pressable>

        {status ? <Text style={[styles.status, { color: t.muted }]}>{status}</Text> : null}

        <Pressable style={styles.link} accessibilityRole="button" onPress={() => router.back()}>
          <Text style={[styles.linkText, { color: t.accent }]}>Done</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 8 },
  heading: { fontSize: 28, fontWeight: '800' },
  section: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
  },
  muted: { fontStyle: 'italic' },
  item: { fontSize: 14 },
  input: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 12, fontSize: 14 },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  button: { borderRadius: 10, padding: 14, alignItems: 'center' },
  buttonText: { fontWeight: '700' },
  status: { marginTop: 12 },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { fontWeight: '600' },
});
