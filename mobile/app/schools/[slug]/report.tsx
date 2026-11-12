import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ActionButton, Card, Label } from '@/components/kit';
import { useSchool } from '@/hooks/useSchool';
import { useSession } from '@/hooks/useSession';
import { ApiError } from '@/lib/api/client';
import { createReport, type ReportKind } from '@/lib/api/reports';
import { messageProblem, REPORT_KINDS, reportErrorMessage } from '@/lib/reports';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

/**
 * "Report a problem": a signed-in user tells the MatFinder team a gym's listing is wrong (schedule, price, closed,
 * contact or something else). The report goes to the admin's Reports tab; nothing changes in the app until someone
 * checks it.
 */
export default function ReportScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const session = useSession();
  const school = useSchool(slug);
  const user = session.data?.user;

  const [kind, setKind] = useState<ReportKind>('schedule');
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);

  const send = useMutation({
    mutationFn: () => createReport({ schoolSlug: slug, kind, message: message.trim() || undefined }),
  });

  if (session.isPending) return <ActivityIndicator style={styles.loading} color={colors.redText} />;
  if (!user) return <Redirect href={{ pathname: '/sign-in', params: { redirect: `/schools/${slug}/report` } }} />;

  const gymName = school.data?.name ?? 'this gym';
  const back = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/schools/[slug]', params: { slug } }));

  if (send.isSuccess) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: 'Report sent' }} />
        <Card style={styles.done}>
          <View style={styles.doneIcon}>
            <Ionicons name="checkmark" size={26} color="#FFFFFF" />
          </View>
          <Text role="heading" style={styles.title}>
            Thanks, we&apos;ll check it
          </Text>
          <Text style={styles.body}>We&apos;ll look at {gymName} and fix the listing if it&apos;s wrong.</Text>
          <ActionButton label="Back to the gym" variant="outline" onPress={back} style={styles.action} />
        </Card>
      </ScrollView>
    );
  }

  const messageError = touched ? messageProblem(kind, message) : null;
  const serverError = send.error ? reportErrorMessage(send.error instanceof ApiError ? send.error.code : undefined, send.error.message) : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Report a problem' }} />
      <Label tone="red">Report a problem</Label>
      <Text role="heading" style={styles.title}>
        {gymName}
      </Text>

      <Card style={styles.form}>
        <View style={styles.field}>
          <Label>What&apos;s the problem?</Label>
          <View role="radiogroup" accessibilityLabel="What's the problem?" style={styles.kinds}>
            {REPORT_KINDS.map((k) => {
              const on = k.value === kind;
              return (
                <Pressable
                  key={k.value}
                  role="radio"
                  aria-checked={on}
                  accessibilityLabel={k.label}
                  onPress={() => setKind(k.value)}
                  style={[styles.kind, on && styles.kindOn]}>
                  <Text style={[styles.kindText, on && styles.kindTextOn]}>{k.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Label>What&apos;s wrong?</Label>
          <TextInput
            nativeID="report-message"
            accessibilityLabel="What's wrong?"
            style={[styles.input, styles.multiline, !!messageError && styles.inputError]}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
            placeholder="For example: the Monday open mat is now at 8 pm"
            placeholderTextColor={colors.textDim}
          />
          {messageError ? <Text style={styles.error}>{messageError}</Text> : <Text style={styles.hint}>Optional, except for Something else</Text>}
        </View>

        {!!serverError && (
          <Text role="alert" style={styles.error}>
            {serverError}
          </Text>
        )}
        <ActionButton
          label={send.isPending ? 'Sending…' : 'Send report'}
          size="lg"
          disabled={send.isPending}
          onPress={() => {
            setTouched(true);
            if (messageProblem(kind, message)) return;
            send.mutate();
          }}
        />
        <Text style={styles.hint}>Only the MatFinder team sees your report.</Text>
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
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kind: { paddingHorizontal: 12, height: 36, justifyContent: 'center', borderRadius: t.radii.control, borderWidth: 1.5, borderColor: t.colors.outline },
  kindOn: { backgroundColor: t.colors.inverse, borderColor: t.colors.inverse },
  kindText: { ...t.type.label, fontSize: 15, color: t.colors.text },
  kindTextOn: { color: t.colors.onInverse },
  hint: { ...t.type.body, fontSize: 13, color: t.colors.textSecondary },
  error: { ...t.type.body, fontSize: 13, color: t.colors.redText },
  done: { marginTop: 16, gap: 10, padding: 20, alignItems: 'flex-start' },
  doneIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.liveFill, alignItems: 'center', justifyContent: 'center' },
  action: { marginTop: 8, alignSelf: 'stretch' },
}));
