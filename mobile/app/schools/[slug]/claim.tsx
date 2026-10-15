import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ActionButton, Card, Label } from '@/components/kit';
import { useMyClaim } from '@/hooks/useMyClaim';
import { useSchool } from '@/hooks/useSchool';
import { useSession } from '@/hooks/useSession';
import { createClaim, type ClaimRole } from '@/lib/api/claims';
import { ApiError } from '@/lib/api/client';
import { CLAIM_ROLES, claimErrorMessage, isClaimOpen, phoneProblem } from '@/lib/claims';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

/**
 * "Claim this gym": a signed-in owner (or manager, head instructor, staff) asks to be connected to a gym. Nothing
 * changes in the app until someone at MatFinder calls them to confirm and accepts the claim.
 */
export default function ClaimScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const session = useSession();
  const school = useSchool(slug);
  const mine = useMyClaim(slug);
  const queryClient = useQueryClient();
  const user = session.data?.user;

  const [name, setName] = useState('');
  const [role, setRole] = useState<ClaimRole>('owner');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);

  const send = useMutation({
    mutationFn: () => createClaim({ schoolSlug: slug, role, phone: phone.trim(), message: message.trim() || undefined, name: name.trim() || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-claim', slug] }),
  });

  if (session.isPending) return <ActivityIndicator style={styles.loading} color={colors.redText} />;
  if (!user) return <Redirect href={{ pathname: '/sign-in', params: { redirect: `/schools/${slug}/claim` } }} />;

  const gymName = school.data?.name ?? 'this gym';
  const back = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/schools/[slug]', params: { slug } }));

  if (send.isSuccess) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: 'Claim sent' }} />
        <Card style={styles.done}>
          <View style={styles.doneIcon}>
            <Ionicons name="checkmark" size={26} color="#FFFFFF" />
          </View>
          <Text role="heading" style={styles.title}>
            Thanks, we&apos;ll be in touch
          </Text>
          <Text style={styles.body}>
            We&apos;ll call you at {phone.trim()} or email {user.email} to confirm you run {gymName}. Until then the gym isn&apos;t marked as claimed.
          </Text>
          <ActionButton label="Back to the gym" variant="outline" onPress={back} style={styles.action} />
        </Card>
      </ScrollView>
    );
  }

  if (school.data?.claimed || isClaimOpen(mine.data?.status)) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Card style={styles.done}>
          <Text role="heading" style={styles.title}>
            {school.data?.claimed ? 'Already claimed' : 'Your claim is being reviewed'}
          </Text>
          <Text style={styles.body}>
            {school.data?.claimed
              ? `${gymName} has already been claimed by its owner. If that's wrong, contact us.`
              : `We'll contact you to confirm you run ${gymName}.`}
          </Text>
          <ActionButton label="Back to the gym" variant="outline" onPress={back} style={styles.action} />
        </Card>
      </ScrollView>
    );
  }

  const phoneError = touched ? phoneProblem(phone) : null;
  const serverError = send.error ? claimErrorMessage(send.error instanceof ApiError ? send.error.code : undefined, send.error.message) : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Label tone="red">Claim this gym</Label>
      <Text role="heading" style={styles.title}>
        {gymName}
      </Text>
      <Text style={styles.body}>
        Do you own or run this gym? Tell us who you are and we&apos;ll call you to confirm. Once confirmed, the gym shows
        &quot;Claimed by the owner&quot;.
      </Text>

      <Card style={styles.form}>
        <View style={styles.field}>
          <Label>Your name</Label>
          <TextInput
            nativeID="claim-name"
            accessibilityLabel="Your name"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={user.name ?? ''}
            placeholderTextColor={colors.textDim}
            autoComplete="name"
          />
        </View>

        <View style={styles.field}>
          <Label>Your role</Label>
          <View role="radiogroup" accessibilityLabel="Your role" style={styles.roles}>
            {CLAIM_ROLES.map((r) => {
              const on = r.value === role;
              return (
                <Pressable
                  key={r.value}
                  role="radio"
                  aria-checked={on}
                  accessibilityLabel={r.label}
                  onPress={() => setRole(r.value)}
                  style={[styles.role, on && styles.roleOn]}>
                  <Text style={[styles.roleText, on && styles.roleTextOn]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Label>Phone</Label>
          <TextInput
            nativeID="claim-phone"
            accessibilityLabel="Phone"
            style={[styles.input, !!phoneError && styles.inputError]}
            value={phone}
            onChangeText={setPhone}
            onBlur={() => setTouched(true)}
            placeholder="702-555-0123"
            placeholderTextColor={colors.textDim}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          {phoneError ? <Text style={styles.error}>{phoneError}</Text> : <Text style={styles.hint}>We call this number to confirm. It&apos;s never shown in the app.</Text>}
        </View>

        <View style={styles.field}>
          <Label>Anything we should know (optional)</Label>
          <TextInput
            nativeID="claim-message"
            accessibilityLabel="Anything we should know"
            style={[styles.input, styles.multiline]}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
            placeholder="For example: best time to call, or the gym's front desk number"
            placeholderTextColor={colors.textDim}
          />
        </View>

        {!!serverError && (
          <Text role="alert" style={styles.error}>
            {serverError}
          </Text>
        )}
        <ActionButton
          label={send.isPending ? 'Sending…' : 'Send claim'}
          size="lg"
          disabled={send.isPending}
          onPress={() => {
            setTouched(true);
            if (phoneProblem(phone)) return;
            send.mutate();
          }}
        />
        <Text style={styles.hint}>Signed in as {user.email}. Only the MatFinder team sees your phone and note.</Text>
      </Card>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  loading: { flex: 1, backgroundColor: t.colors.bg },
  scroll: { flex: 1, backgroundColor: t.colors.bg },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: t.layout.gutter, paddingBottom: 48, gap: 8 },
  title: { ...t.type.display, fontSize: 34, lineHeight: 36, color: t.colors.text },
  body: { ...t.type.body, fontSize: 15, lineHeight: 22, color: t.colors.textSecondary },
  form: { marginTop: 12, gap: 16, padding: 16 },
  field: { gap: 6 },
  input: {
    ...t.type.body,
    fontSize: 16,
    color: t.colors.text,
    backgroundColor: t.colors.field,
    borderWidth: 1,
    borderColor: t.colors.outline,
    borderRadius: t.radii.field,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  inputError: { borderColor: t.colors.redText },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  role: { paddingHorizontal: 12, height: 36, justifyContent: 'center', borderRadius: t.radii.control, borderWidth: 1.5, borderColor: t.colors.outline },
  roleOn: { backgroundColor: t.colors.inverse, borderColor: t.colors.inverse },
  roleText: { ...t.type.label, fontSize: 15, color: t.colors.text },
  roleTextOn: { color: t.colors.onInverse },
  hint: { ...t.type.body, fontSize: 13, color: t.colors.textSecondary },
  error: { ...t.type.body, fontSize: 13, color: t.colors.redText },
  done: { marginTop: 16, gap: 10, padding: 20, alignItems: 'flex-start' },
  doneIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.liveFill, alignItems: 'center', justifyContent: 'center' },
  action: { marginTop: 8, alignSelf: 'stretch' },
}));
