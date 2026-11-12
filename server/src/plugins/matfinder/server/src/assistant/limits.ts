import { messageText } from '../gym-chat/limits';

/** The assistant's limits (plan 09 → *The MatFinder assistant*, from maison's). */
export const ASSISTANT_LIMITS = {
  /** Messages from the admin in one chat. The whole chat is sent (and billed) each turn. */
  adminMessages: 20,
  messageChars: 4_000,
  /** The largest any other turn can be as sent back (an answer, its thinking, a tool result): `maxTokens` at ~4
   * characters a token, or a tool result at its cap, with room for JSON. */
  turnChars: 70_000,
  /** Model turns for one answer (tool calls and the answer after them). */
  modelTurns: 6,
  deadlineMs: 90_000,
  /** Output tokens of one model turn, thinking included. */
  maxTokens: 16_000,
} as const;

/** Roles the model may see. A browser can send `system` or `developer` messages; those are dropped. */
const CONVERSATION_ROLES = new Set(['user', 'assistant', 'reasoning', 'tool']);

type AnyMessage = { role?: unknown; content?: unknown; parts?: unknown };

/** The conversation as the model may see it: user, assistant, reasoning and tool messages, as they were sent. */
export const onlyConversation = <T extends AnyMessage>(messages: T[]): T[] => messages.filter((m) => CONVERSATION_ROLES.has(m.role as string));

const size = (message: AnyMessage) => JSON.stringify(message ?? '').length;

/**
 * Approval decisions already used, so a double click or a replayed request can't run a change twice: TanStack AI
 * rebuilds the paused call from the history, so the same approval sent again would run the tool again. In memory per
 * Strapi process, for an hour.
 */
export class Decisions {
  private used = new Map<string, number>();
  constructor(
    private readonly ttlMs = 60 * 60_000,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** True, and the decisions are recorded, when none of them was used before in this chat. */
  takeOnce(threadId: string, interruptIds: string[]): boolean {
    const now = this.now();
    for (const [key, at] of this.used) if (now - at > this.ttlMs) this.used.delete(key);
    const keys = interruptIds.map((id) => `${threadId}\u0000${id}`);
    if (keys.some((key) => this.used.has(key))) return false;
    for (const key of keys) this.used.set(key, now);
    return true;
  }
}

export type AssistantProblem = 'no_message' | 'message_too_long' | 'chat_too_long';

/**
 * What's wrong with a chat before it reaches the model, or null. Every turn is checked, not only the newest: the
 * browser sends the whole chat and all of it is billed (the gym chat's CodeRabbit lesson). An admin message is at most
 * 4,000 characters; every other turn at most what the model or a tool could have produced; and a chat ends at 20
 * admin messages, each followed by at most 3 turns per model turn (tool calls, results, reasoning).
 */
export function checkChat(messages: AnyMessage[]): AssistantProblem | null {
  const fromAdmin = messages.filter((m) => m.role === 'user');
  if (fromAdmin.length === 0) return 'no_message';
  if (fromAdmin.length > ASSISTANT_LIMITS.adminMessages) return 'chat_too_long';
  if (fromAdmin.some((m) => messageText(m).length > ASSISTANT_LIMITS.messageChars)) return 'message_too_long';
  const others = messages.filter((m) => m.role !== 'user');
  if (others.length > fromAdmin.length * ASSISTANT_LIMITS.modelTurns * 3) return 'chat_too_long';
  if (others.some((m) => size(m) > ASSISTANT_LIMITS.turnChars)) return 'chat_too_long';
  return null;
}
