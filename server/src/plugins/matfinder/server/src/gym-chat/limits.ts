/** The gym chat's limits (plan 09 → D6 and *The gym chat*). */
export const GYM_CHAT_LIMITS = {
  /** Questions in one chat: the whole conversation is sent each turn, so this also caps its size. */
  questionsPerChat: 12,
  questionChars: 500,
  /** Per signed-in user per day (UTC), counted in memory by this Strapi process. */
  questionsPerDay: 40,
  /** For the whole answer, from the first chunk. */
  deadlineMs: 30_000,
  /** Output tokens of the answer, thinking included. The instructions ask for short answers. */
  maxTokens: 4_000,
  /** Characters of gym data and knowledge in the prompt before entries are ranked and cut. */
  contextChars: 30_000,
} as const;

type Part = { type?: unknown; text?: unknown; content?: unknown };
type AnyMessage = { role?: unknown; content?: unknown; parts?: unknown };

const partText = (p: Part) => (p?.type === 'text' ? (typeof p.text === 'string' ? p.text : typeof p.content === 'string' ? p.content : '') : '');

/**
 * The text of one message. On the wire (AG-UI) a user message's `content` is a string or an array of parts whose text
 * is in `text`; a TanStack UIMessage keeps it in `parts[].content`. Both are read.
 */
export function messageText(message: AnyMessage): string {
  if (typeof message.content === 'string') return message.content;
  const parts = Array.isArray(message.content) ? message.content : Array.isArray(message.parts) ? message.parts : [];
  return (parts as Part[]).map(partText).filter(Boolean).join('\n');
}

/** Roles the model may see. `reasoning` carries an assistant's thinking, which goes back unchanged. */
const CONVERSATION_ROLES = new Set(['user', 'assistant', 'reasoning']);

/**
 * The conversation as the model may see it. The request parser accepts any AG-UI role, so `system`, `developer`, `tool`
 * and `activity` messages from a browser are dropped here, and a user message keeps only its text (no images or files).
 * Assistant and reasoning messages are kept as they came, so thinking reaches the model unchanged.
 */
export function onlyConversation<T extends AnyMessage>(messages: T[]): T[] {
  return messages
    .filter((m) => CONVERSATION_ROLES.has(m.role as string))
    .map((m) => (m.role === 'user' && typeof m.content !== 'string' ? { ...m, content: messageText(m) } : m))
    .filter((m) => m.role !== 'user' || messageText(m).trim() !== '');
}

export type ConversationProblem = 'no_question' | 'question_too_long' | 'chat_too_long';

/** What's wrong with a conversation before it reaches the model, or null. Reads the user messages only. */
export function checkConversation(messages: AnyMessage[]): ConversationProblem | null {
  const questions = messages.filter((m) => m.role === 'user').map(messageText);
  if (questions.length === 0) return 'no_question';
  if (questions.length > GYM_CHAT_LIMITS.questionsPerChat) return 'chat_too_long';
  if (questions[questions.length - 1].length > GYM_CHAT_LIMITS.questionChars) return 'question_too_long';
  return null;
}

/** The newest question: what the knowledge ranker searches for when a gym has more entries than fit. */
export const lastQuestion = (messages: AnyMessage[]) => {
  const users = messages.filter((m) => m.role === 'user');
  return users.length ? messageText(users[users.length - 1]) : '';
};

/**
 * Questions per key per UTC day, in memory. Strapi Cloud runs one process, so this is the whole count there; a
 * restart starts the day over, which is acceptable for a cost guard.
 */
export class DailyCounter {
  private counts = new Map<string, number>();
  private day = '';

  constructor(
    private readonly limit: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Counts one question for `key`. False, and nothing counted, when the key is at the limit. */
  take(key: string): boolean {
    const today = this.now().toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.counts.clear();
    }
    const used = this.counts.get(key) ?? 0;
    if (used >= this.limit) return false;
    this.counts.set(key, used + 1);
    return true;
  }
}
