import { fetchServerSentEvents, xhrServerSentEvents } from '@tanstack/ai-client';
import { useChat } from '@tanstack/ai-react';
import { useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { apiBase, sessionCookie } from '@/lib/api/client';
import { ANSWER_NOTES, chatErrorView, gymChatPath } from '@/lib/gym-chat';

/**
 * The "Ask about this gym" chat (plan 09, M18): TanStack AI's `useChat` against Strapi's gym chat route, which streams
 * server-sent events. The session goes as it does in lib/api/client.ts: the browser's cookies on the web, the Cookie
 * header on iOS and Android. React Native's `fetch` can't read a streamed body, so native uses TanStack AI's XHR
 * transport, which can. Nothing is saved: the chat lasts while the screen is open.
 */
export function useGymChat(slug: string) {
  const [note, setNote] = useState<string | null>(null);

  const connection = useMemo(() => {
    const url = `${apiBase()}${gymChatPath(slug)}`;
    if (Platform.OS === 'web') return fetchServerSentEvents(url, { credentials: 'include' });
    // Read on every question, so a refreshed session cookie is used.
    return xhrServerSentEvents(url, async () => {
      const cookie = await sessionCookie();
      return cookie ? { headers: { Cookie: cookie } } : {};
    });
  }, [slug]);

  const chat = useChat({
    connection,
    // A question sent while an answer is coming is dropped, never queued out of sight; the composer is off meanwhile.
    queue: 'drop',
    onCustomEvent: (name: string) => setNote(ANSWER_NOTES[name] ?? null),
  });

  return {
    messages: chat.messages,
    busy: chat.isLoading,
    error: chatErrorView(chat.error),
    /** A note under the last answer (declined, cut off). */
    note,
    ask: (question: string) => {
      setNote(null);
      return chat.sendMessage(question);
    },
    stop: chat.stop,
    retry: () => {
      setNote(null);
      return chat.reload();
    },
    newChat: () => {
      setNote(null);
      chat.clear();
    },
  };
}
