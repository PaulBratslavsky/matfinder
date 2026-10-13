import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ActionButton, Card, Label, RankBar, SectionTitle } from '@/components/kit';
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

export default function AccountScreen() {
  const styles = useStyles();
  const session = useSession();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const user = session.data?.user;

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    // Gated school pages must not stay in the cache after signing out.
    queryClient.removeQueries({ queryKey: ['school'] });
    setSigningOut(false);
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <RankBar stripes={2} width={52} />
      {session.isPending ? null : user ? (
        <Card style={styles.card}>
          <Label>Signed in</Label>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.body}>{user.email}</Text>
          <ActionButton label={signingOut ? 'Signing out…' : 'Sign out'} variant="outline" onPress={signOut} disabled={signingOut} style={styles.action} />
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.name}>{"You're browsing as a guest"}</Text>
          <Text style={styles.body}>
            {"The map, search and next sessions are open to everyone. A free account shows each gym's full schedule, pricing, coaches and contact details."}
          </Text>
          <ActionButton label="Create account" onPress={() => router.push({ pathname: '/sign-up', params: { redirect: '/account' } })} style={styles.action} />
          <ActionButton label="Sign in" variant="outline" onPress={() => router.push({ pathname: '/sign-in', params: { redirect: '/account' } })} />
        </Card>
      )}

      <SectionTitle>Appearance</SectionTitle>
      <AppearancePicker />
      <Text style={styles.hint}>System follows your phone&apos;s light or dark setting.</Text>
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
}));
