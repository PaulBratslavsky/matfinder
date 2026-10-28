import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, Label } from '@/components/kit';
import { useChatStatus } from '@/hooks/useChatStatus';
import { useGymChat } from '@/hooks/useGymChat';
import { useSchool } from '@/hooks/useSchool';
import { useSession } from '@/hooks/useSession';
import { authClient } from '@/lib/auth-client';
import { QUESTION_MAX, messageText, suggestedQuestions } from '@/lib/gym-chat';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

/**
 * "Ask about this gym" (plan 09, M18): a chat about one gym, answered by Strapi's gym chat from the gym's page and its
 * knowledge, streaming in as it's written. Account-only, like the gym page. A sheet on iOS and Android, a page on the
 * web. Nothing is saved.
 */
export default function AskScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const session = useSession();
  const school = useSchool(slug);
  const status = useChatStatus();
  const chat = useGymChat(slug);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollView>(null);
  const here = `/schools/${slug}/ask`;

  const close = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/schools/[slug]', params: { slug } }));
  // A sheet on iOS and Android closes with Done. A page on the web goes back to the gym, even when it was opened from a
  // link (after signing in, there's no history to go back through).
  const headerButtons =
    Platform.OS === 'web'
      ? {
          headerLeft: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Back to the gym" onPress={close} hitSlop={8} style={styles.headerBack}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>
          ),
        }
      : {
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} hitSlop={8}>
              <Text style={styles.headerButton}>Done</Text>
            </Pressable>
          ),
        };

  if (session.isPending) return <ActivityIndicator style={styles.loading} color={colors.redText} />;
  if (!session.data?.user) return <Redirect href={{ pathname: '/sign-in', params: { redirect: here } }} />;

  const gym = school.data;
  const title = gym?.name ?? 'Ask about this gym';
  if (status.data && !status.data.ready) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title, ...headerButtons }} />
        <Text style={styles.body}>Ask about this gym isn&apos;t available right now.</Text>
        <ActionButton label="Back to the gym" variant="outline" onPress={close} />
      </View>
    );
  }

  const send = (text: string) => {
    const question = text.trim();
    if (!question || chat.busy) return;
    setDraft('');
    void chat.ask(question);
  };
  const signInAgain = async () => {
    await authClient.signOut();
    queryClient.removeQueries({ queryKey: ['school'] });
    router.replace({ pathname: '/sign-in', params: { redirect: here } });
  };

  const last = chat.messages[chat.messages.length - 1];
  const waiting = chat.busy && (!last || last.role === 'user' || !messageText(last).trim());
  const canSend = !!draft.trim() && !chat.busy;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 56 : 0}>
      <Stack.Screen options={{ title, ...headerButtons }} />
      <ScrollView
        ref={scroll}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        {chat.messages.length === 0 ? (
          <View style={styles.intro}>
            <Label tone="red">Ask about this gym</Label>
            <Text role="heading" style={styles.title}>
              {gym?.name ?? ' '}
            </Text>
            <Text style={styles.body}>Ask about classes, prices, visiting or what to bring. Answers come from MatFinder&apos;s information about this gym.</Text>
            {!!gym && (
              <View style={styles.suggestions}>
                {suggestedQuestions(gym).map((q) => (
                  <Pressable key={q} accessibilityRole="button" onPress={() => send(q)} style={styles.suggestion}>
                    <Text style={styles.suggestionText}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : (
          chat.messages.map((m) => {
            const text = messageText(m);
            if (!text) return null;
            const mine = m.role === 'user';
            return (
              <View key={m.id} style={[styles.row, mine && styles.rowMine]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text selectable style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                    {text}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {waiting && (
          <View style={styles.waiting} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={colors.textSecondary} />
            <Text style={styles.muted}>Looking it up…</Text>
          </View>
        )}
        {!!chat.note && !chat.busy && <Text style={styles.muted}>{chat.note}</Text>}
        {!!chat.error && (
          <View role="alert" style={styles.errorBox}>
            <Text style={styles.errorText}>{chat.error.text}</Text>
            {chat.error.signIn ? (
              <ActionButton label="Sign in again" variant="outline" compact onPress={signInAgain} />
            ) : chat.error.newChat ? (
              <ActionButton label="New chat" variant="outline" compact onPress={chat.newChat} />
            ) : (
              <ActionButton label="Try again" variant="outline" compact onPress={() => void chat.retry()} />
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.inputRow}>
          <TextInput
            nativeID="ask-question"
            accessibilityLabel="Your question"
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={`Ask about ${gym?.name ?? 'this gym'}`}
            placeholderTextColor={colors.textDim}
            multiline
            maxLength={QUESTION_MAX}
            submitBehavior="submit"
            returnKeyType="send"
            onSubmitEditing={() => send(draft)}
            onKeyPress={(e) => {
              // The web: Enter sends, Shift+Enter adds a line.
              const key = e.nativeEvent as { key: string; shiftKey?: boolean };
              if (Platform.OS === 'web' && key.key === 'Enter' && !key.shiftKey) {
                (e as unknown as { preventDefault?: () => void }).preventDefault?.();
                send(draft);
              }
            }}
          />
          {chat.busy ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Stop" onPress={chat.stop} style={[styles.send, styles.stop]}>
              <Ionicons name="stop" size={16} color={colors.text} />
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Send" disabled={!canSend} onPress={() => send(draft)} style={[styles.send, !canSend && styles.sendOff]}>
              <Ionicons name="arrow-up" size={20} color={colors.onRed} />
            </Pressable>
          )}
        </View>
        {draft.length > QUESTION_MAX - 100 && (
          <Text style={styles.count}>
            {draft.length}/{QUESTION_MAX}
          </Text>
        )}
        <Text style={styles.disclaimer}>
          Answers come from MatFinder&apos;s information about this gym and can be out of date. Call the gym to be sure.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  loading: { flex: 1, backgroundColor: t.colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: t.colors.bg },
  screen: { flex: 1, backgroundColor: t.colors.bg },
  headerButton: { ...t.type.label, fontSize: 17, color: t.colors.redText },
  headerBack: { paddingHorizontal: 8 },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: t.layout.maxContentWidth, alignSelf: 'center', padding: t.layout.gutter, paddingBottom: 24, gap: 10 },
  intro: { gap: 8, paddingTop: 8 },
  title: { ...t.type.display, fontSize: 34, lineHeight: 36, color: t.colors.text },
  body: { ...t.type.body, fontSize: 15, lineHeight: 22, color: t.colors.textSecondary },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  suggestion: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: t.radii.control,
    borderWidth: 1.5,
    borderColor: t.colors.outline,
    backgroundColor: t.colors.surface,
  },
  suggestionText: { ...t.type.bodyMedium, fontSize: 15, color: t.colors.text },
  row: { flexDirection: 'row', justifyContent: 'flex-start' },
  rowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '86%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: t.radii.card },
  bubbleMine: { backgroundColor: t.colors.inverse, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.surfaceBorder, borderBottomLeftRadius: 4 },
  bubbleText: { ...t.type.body, fontSize: 16, lineHeight: 23, color: t.colors.text },
  bubbleTextMine: { color: t.colors.onInverse },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  muted: { ...t.type.body, fontSize: 14, color: t.colors.textSecondary },
  errorBox: { gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: t.radii.field, backgroundColor: t.colors.redTint },
  errorText: { ...t.type.body, fontSize: 15, color: t.colors.text },
  composer: {
    borderTopWidth: 1,
    borderTopColor: t.colors.separator,
    backgroundColor: t.colors.bg,
    paddingHorizontal: t.layout.gutter,
    paddingTop: 10,
    gap: 6,
  },
  inputRow: { width: '100%', maxWidth: t.layout.maxContentWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    ...t.type.body,
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 132,
    color: t.colors.text,
    backgroundColor: t.colors.field,
    borderWidth: 1,
    borderColor: t.colors.outline,
    borderRadius: t.radii.field,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.redFill, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
  stop: { backgroundColor: t.colors.field, borderWidth: 1.5, borderColor: t.colors.outline },
  count: { ...t.type.body, fontSize: 12, color: t.colors.textSecondary, alignSelf: 'flex-end' },
  disclaimer: { ...t.type.body, fontSize: 12, lineHeight: 16, color: t.colors.textSecondary, textAlign: 'center', maxWidth: t.layout.maxContentWidth, alignSelf: 'center' },
}));
