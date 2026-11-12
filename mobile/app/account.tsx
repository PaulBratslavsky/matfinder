import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ActionButton, Card, Label, RankBar, SectionTitle } from '@/components/kit';
import { useSaved } from '@/hooks/useSaved';
import { useSession } from '@/hooks/useSession';
import { authClient } from '@/lib/auth-client';
import { makeStyles, useTheme, type ThemePreference } from '@/theme/ThemeProvider';

const APPEARANCE: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

/** Light, dark, or whatever the phone is set to; saved on this device. */
function AppearancePicker() {
  const styles = useStyles();
  const { preference, setPreference } = useTheme();
  return (
    <View role="radiogroup" accessibilityLabel="Appearance" style={styles.segments}>
      {APPEARANCE.map((o) => {
        const on = o.key === preference;
        return (
          <Pressable
            key={o.key}
            role="radio"
            accessibilityLabel={o.label}
            aria-checked={on}
            onPress={() => setPreference(o.key)}
            style={[styles.segment, on && styles.segmentOn]}>
            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SavedGyms() {
  const styles = useStyles();
  const saved = useSaved();
  const items = saved.data?.items ?? [];
  return (
    <>
      <SectionTitle>Saved gyms</SectionTitle>
      {saved.isPending ? null : items.length === 0 ? (
        <Text style={styles.hint}>Tap the bookmark on a gym&apos;s page to save it here.</Text>
      ) : (
        items.map((g) => (
          <Pressable key={g.slug} accessibilityRole="link" accessibilityLabel={g.name} onPress={() => router.push({ pathname: '/schools/[slug]', params: { slug: g.slug } })} style={styles.savedRow}>
            <Text style={styles.savedName}>{g.name}</Text>
            <Text style={styles.hint}>{[g.neighborhood, g.city?.name].filter(Boolean).join(' · ')}</Text>
          </Pressable>
        ))
      )}
    </>
  );
}

/** "Delete account": an inline confirm with the password (C15). Better Auth deletes the account and its sessions. */
function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (busy || !password) return;
    setError(null);
    setBusy(true);
    const { error: err } = await authClient.deleteUser({ password });
    setBusy(false);
    if (err) return setError(err.code === 'INVALID_PASSWORD' ? "That password isn't right." : (err.message ?? 'Something went wrong. Try again.'));
    onDeleted();
  }

  if (!open) return <ActionButton label="Delete account" variant="outline" onPress={() => setOpen(true)} style={styles.action} />;
  return (
    <Card style={styles.card}>
      <Label tone="red">Delete account</Label>
      <Text style={styles.body}>
        {"This removes your account and your saved gyms, and signs you out on every device. Claims still waiting for review are withdrawn, and your name, email and phone number are removed from all your claims. It can't be undone."}
      </Text>
      <TextInput
        nativeID="delete-password"
        accessibilityLabel="Your password"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        placeholderTextColor={colors.textDim}
        secureTextEntry
        autoComplete="current-password"
        onSubmitEditing={confirm}
      />
      {!!error && (
        <Text role="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <ActionButton label={busy ? 'Deleting…' : 'Delete my account'} onPress={confirm} disabled={busy || !password} style={styles.action} />
      <ActionButton
        label="Cancel"
        variant="outline"
        disabled={busy}
        onPress={() => {
          setOpen(false);
          setPassword('');
          setError(null);
        }}
      />
    </Card>
  );
}

export default function AccountScreen() {
  const styles = useStyles();
  const session = useSession();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const user = session.data?.user;

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    // Gated school pages must not stay in the cache after signing out.
    queryClient.removeQueries({ queryKey: ['school'] });
    queryClient.removeQueries({ queryKey: ['saved'] });
    setSigningOut(false);
  }

  async function afterDelete() {
    // Nothing from the deleted account may stay on screen: gated gym pages, claim status, chat status.
    queryClient.clear();
    setDeleted(true);
    await session.refetch();
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <RankBar stripes={2} width={52} />
      {session.isPending ? null : user ? (
        <>
          <Card style={styles.card}>
            <Label>Signed in</Label>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.body}>{user.email}</Text>
            <ActionButton label={signingOut ? 'Signing out…' : 'Sign out'} variant="outline" onPress={signOut} disabled={signingOut} style={styles.action} />
          </Card>
          <SavedGyms />
          <DeleteAccount onDeleted={afterDelete} />
        </>
      ) : (
        <>
          {deleted && (
            <Card style={styles.card}>
              <Text style={styles.name}>Your account was deleted.</Text>
            </Card>
          )}
          <Card style={styles.card}>
            <Text style={styles.name}>{"You're browsing as a guest"}</Text>
            <Text style={styles.body}>
              {"The map, search and next sessions are open to everyone. A free account shows each gym's full schedule, pricing, coaches and contact details."}
            </Text>
            <ActionButton label="Create account" onPress={() => router.push({ pathname: '/sign-up', params: { redirect: '/account' } })} style={styles.action} />
            <ActionButton label="Sign in" variant="outline" onPress={() => router.push({ pathname: '/sign-in', params: { redirect: '/account' } })} />
          </Card>
        </>
      )}

      <SectionTitle>Appearance</SectionTitle>
      <AppearancePicker />
      <Text style={styles.hint}>System follows your phone&apos;s light or dark setting.</Text>
      <Pressable accessibilityRole="link" onPress={() => router.push('/privacy')} hitSlop={8} style={styles.privacy}>
        <Text style={styles.link}>Privacy</Text>
      </Pressable>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.colors.bg },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: t.layout.gutter, paddingBottom: 48 },
  card: { marginTop: 16, gap: 8, padding: 16 },
  name: { ...t.type.display, fontSize: 28, lineHeight: 30, color: t.colors.text },
  body: { ...t.type.body, fontSize: 15, lineHeight: 22, color: t.colors.textSecondary },
  action: { marginTop: 8 },
  segments: { flexDirection: 'row', height: 44, borderRadius: t.radii.field, borderWidth: 1.5, borderColor: t.colors.outline, overflow: 'hidden' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: t.colors.inverse },
  segmentText: { ...t.type.label, fontSize: 15, color: t.colors.textSecondary },
  segmentTextOn: { color: t.colors.onInverse },
  hint: { ...t.type.body, fontSize: 13, color: t.colors.textSecondary, marginTop: 8 },
  savedRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.colors.outline },
  savedName: { ...t.type.bodySemibold, fontSize: 16, color: t.colors.text },
  input: { ...t.type.body, fontSize: 16, color: t.colors.text, backgroundColor: t.colors.field, borderWidth: 1, borderColor: t.colors.outline, borderRadius: t.radii.field, paddingHorizontal: 14, paddingVertical: 12 },
  error: { ...t.type.body, fontSize: 13, color: t.colors.redText },
  privacy: { marginTop: 24, alignSelf: 'flex-start' },
  link: { ...t.type.label, fontSize: 15, color: t.colors.redText },
}));
