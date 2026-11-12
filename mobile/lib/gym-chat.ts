import type { SchoolPage } from './api/schools';

/** "Ask about this gym" (plan 09, M18): the parts of the chat screen that don't need React. */

/** The server's limit on one question, in characters. */
export const QUESTION_MAX = 500;

/** The gym chat route on Strapi, under the API base. */
export const gymChatPath = (slug: string) => `/api/matfinder/schools/${encodeURIComponent(slug)}/chat`;

/**
 * Up to four questions to tap in an empty chat, chosen from what the gym's page has, so each one has an answer:
 * dropping in (unless visitors aren't welcome), a beginner class, what to wear, kids' classes, and parking last.
 */
export function suggestedQuestions(school: Pick<SchoolPage, 'pricing' | 'schedule'>): string[] {
  const out: string[] = [];
  const visitors = school.pricing?.visitorsWelcome;
  if (visitors !== false) out.push(school.pricing?.dropInFee != null ? 'Can I drop in, and what does it cost?' : 'Can I drop in as a visitor?');
  if (school.schedule.some((s) => s.classType === 'fundamentals' || s.classType === 'all_levels')) out.push("When's the next beginner class?");
  out.push(school.schedule.some((s) => s.style === 'gi' || s.style === 'both') ? 'Do I need a gi?' : 'What should I wear?');
  if (school.schedule.some((s) => s.classType === 'kids')) out.push('Do they have kids classes?');
  out.push('Is there parking?');
  return out.slice(0, 4);
}

/** The server's own error codes: their messages are already written for people. */
const SERVER_CODES = new Set([
  'not_ready',
  'not_found',
  'no_question',
  'question_too_long',
  'chat_too_long',
  'daily_limit',
  'service_limit',
  'timeout',
  'busy',
  'cut_off',
  'internal',
]);

export type ChatErrorView = {
  text: string;
  /** The session ended: offer "Sign in again". */
  signIn?: boolean;
  /** The chat is too long to go on: offer "New chat". */
  newChat?: boolean;
};

/**
 * What to show for an error from the chat: the server's words for its own codes, "sign in again" for a refused
 * session (the transports report it as "HTTP error! status: 403" or "XHR error! status: 403"), and plain text for a
 * dropped connection or anything else. Null for a stopped answer, which isn't an error.
 */
export function chatErrorView(error: unknown): ChatErrorView | null {
  if (!error) return null;
  const e = error as { name?: string; message?: string; code?: unknown };
  if (e.name === 'AbortError') return null;
  const code = typeof e.code === 'string' ? e.code : null;
  if (code && SERVER_CODES.has(code) && e.message) return { text: e.message, newChat: code === 'chat_too_long' };
  if (/status: (401|403)\b/.test(e.message ?? '')) return { text: 'Your session has ended. Sign in again to keep asking.', signIn: true };
  if (e.name === 'StreamReadError' || /network|failed to fetch|request failed|load failed/i.test(e.message ?? '')) {
    return { text: 'Lost the connection. Check your internet and try again.' };
  }
  return { text: 'Something went wrong. Try again.' };
}

/** Notes the server sends as custom events after an answer. */
export const ANSWER_NOTES: Record<string, string> = {
  declined: "I can't help with that one. Try asking another way.",
  cut_off: 'The answer was cut off. Try a narrower question.',
};

type Part = { type: string; content?: unknown };

/** A chat message's visible text: its text parts, in order. */
export const messageText = (message: { parts: ReadonlyArray<Part> }) =>
  message.parts
    .filter((p) => p.type === 'text' && typeof p.content === 'string')
    .map((p) => p.content as string)
    .join('');
