/** The Assistant tab (plan 09, M19): the parts that don't need React. */

declare const process: { env: Record<string, string | undefined> };

export const ASSISTANT_PATHS = { status: '/matfinder/assistant/status', chat: '/matfinder/assistant/chat' } as const;

export type ToolInfo = { name: string; label: string; write: boolean };
export type AssistantStatus = { ready: true; model: string; tools: ToolInfo[] } | { ready: false; reason: string };

/** The server's limit on one message. */
export const MESSAGE_MAX = 4_000;

/** Buttons above the composer: questions that show what the assistant can do. */
export const QUICK_PROMPTS = [
  'Which claims are waiting?',
  'How many gyms are published, and how many are drafts?',
  "Which gyms haven't had their schedule verified in 90 days?",
  'What did the web agent add this week?',
] as const;

/** Notes the server sends as custom events after an answer. */
export const NOTES: Record<string, string> = {
  declined: 'The model declined to answer this. Rephrase the question.',
  cut_off: 'The answer was cut off because it was too long. Ask for less.',
  max_turns: 'The assistant stopped after 6 steps. Ask a narrower question.',
};

const SERVER_CODES = new Set([
  'not_ready',
  'no_message',
  'message_too_long',
  'chat_too_long',
  'already_decided',
  'timeout',
  'busy',
  'key',
  'model',
  'internal',
]);

/** What to show for an error from the chat. Null for a stopped answer. */
export function errorText(error: unknown): { text: string; newChat?: boolean } | null {
  if (!error) return null;
  const e = error as { name?: string; message?: string; code?: unknown };
  if (e.name === 'AbortError') return null;
  if (typeof e.code === 'string' && SERVER_CODES.has(e.code) && e.message) return { text: e.message, newChat: e.code === 'chat_too_long' };
  if (/status: 401\b/.test(e.message ?? '')) return { text: 'Your Strapi session has ended. Reload the page to sign in again.' };
  if (/status: 403\b/.test(e.message ?? '')) return { text: "Your role can't use the assistant." };
  if (e.name === 'StreamReadError' || /network|failed to fetch|load failed/i.test(e.message ?? '')) return { text: 'The connection to Strapi was lost. Try again.' };
  return { text: 'Something went wrong. Try again.' };
}

/**
 * The admin's token, where Strapi's admin keeps it (5.58: `localStorage.jwtToken` as JSON with "remember me", the
 * `jwtToken` cookie otherwise). A plain fetch (the chat's stream) isn't refreshed by Strapi, so the tab first calls
 * through Strapi's own fetch client, which refreshes an expired token, then reads it here.
 */
export function adminToken(): string | null {
  try {
    const stored = localStorage.getItem('jwtToken');
    if (stored) return JSON.parse(stored);
  } catch {
    // Private mode or a malformed value: fall back to the cookie.
  }
  let name = 'jwtToken';
  try {
    // Strapi's admin build replaces this exact expression with its setting (empty unless the app renames the cookie).
    name = process.env.STRAPI_ADMIN_AUTH_COOKIE_NAME || 'jwtToken';
  } catch {
    // No `process` outside Strapi's admin build.
  }
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/** Enter sends; Shift+Enter adds a line; the Enter that confirms an IME composition sends nothing. */
export const sendsOnKey = (e: { key: string; shiftKey: boolean; isComposing?: boolean; keyCode?: number }) =>
  e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229;

export type PartLike = { type: string; [field: string]: any };

export const toolResultOf = (parts: readonly PartLike[], callId: string) => parts.find((p) => p.type === 'tool-result' && p.toolCallId === callId);

const parse = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

/** A tool call's arguments as an object (`input`, or the JSON `arguments`). */
export const argsOf = (call: PartLike): Record<string, unknown> => {
  const args = call.input ?? parse(call.arguments);
  return args && typeof args === 'object' ? (args as Record<string, unknown>) : {};
};

export type ToolBoxModel = {
  name: string;
  state: 'running' | 'waiting' | 'denied' | 'done' | 'failed';
  /** The header's status: "3 results", "done", "failed", "waiting for approval", "not approved". */
  status: string;
  /** The result as JSON, or the error's message. */
  body: string;
};

/** The first list in a result, for "3 results". */
const countOf = (output: unknown): number | null => {
  if (!output || typeof output !== 'object') return null;
  const list = Object.values(output as Record<string, unknown>).find(Array.isArray);
  return Array.isArray(list) ? list.length : null;
};

/** How a tool call shows in its box, from the call and its result. */
export function toolBoxOf(call: PartLike, result: PartLike | undefined): ToolBoxModel {
  const approval = call.approval as { needsApproval?: boolean; approved?: boolean } | undefined;
  if (approval?.needsApproval && approval.approved === undefined && !result) return { name: call.name, state: 'waiting', status: 'waiting for approval', body: '' };
  if (approval?.approved === false) return { name: call.name, state: 'denied', status: 'not approved', body: 'You denied this change. Nothing was written.' };
  const output = result ? parse(result.content) : call.output;
  if (output === undefined) return { name: call.name, state: 'running', status: 'running…', body: '' };
  const error = (output as { error?: { message?: string } })?.error;
  if (result?.state === 'error' || error) return { name: call.name, state: 'failed', status: 'failed', body: error?.message ?? result?.error ?? 'The tool failed.' };
  const n = countOf(output);
  return { name: call.name, state: 'done', status: n === null ? 'done' : `${n} result${n === 1 ? '' : 's'}`, body: JSON.stringify(output, null, 2) ?? '' };
}

/** A write waiting for the admin: its approval is asked for and not given yet. */
export const awaitsApproval = (call: PartLike, result: PartLike | undefined) =>
  call.type === 'tool-call' && call.approval?.needsApproval === true && call.approval.approved === undefined && !result;

/** What `useChat().interrupts` holds, as far as the tab reads it. */
export type InterruptLike = {
  id: string;
  kind?: string;
  canResolve?: boolean;
  metadata?: Record<string, any>;
  resolveInterrupt?: (response: unknown) => void;
};

/**
 * The paused run's interrupt for one tool call. TanStack AI names it `approval_<toolCallId>`. The browser has no copy
 * of the server's tool schemas, so it reads the pause as a generic interrupt, which has no `toolCallId` of its own.
 */
export const interruptFor = <T extends InterruptLike>(interrupts: readonly T[], call: PartLike): T | undefined =>
  interrupts.find(
    (i) => (call.approval?.id && i.id === call.approval.id) || i.id === `approval_${call.id}` || i.metadata?.['tanstack:interruptBinding']?.toolCallId === call.id,
  );

/**
 * Sends the admin's decision: the chat resumes the paused run on Strapi once every pause is answered. A generic
 * interrupt takes the server's response as is (`{ approved }`); a bound tool approval takes the boolean. False when
 * the decision can't be sent (the pause is gone or expired).
 */
export function resolveApproval(interrupt: InterruptLike | undefined, approved: boolean): boolean {
  if (!interrupt?.resolveInterrupt || interrupt.canResolve === false) return false;
  interrupt.resolveInterrupt(interrupt.kind === 'tool-approval' ? approved : { approved });
  return true;
}

/** The arguments an approval card lists: everything but the model's `summary`, as short text. */
export function approvalDetails(args: Record<string, unknown>): { key: string; value: string }[] {
  return Object.entries(args)
    .filter(([key, value]) => key !== 'summary' && value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({ key, value: typeof value === 'string' ? value : JSON.stringify(value) }));
}

/** An http(s) link from Markdown, or null: other schemes (javascript:, data:) are dropped. */
export const safeLink = (href: string | null | undefined) => {
  if (!href) return null;
  try {
    const url = new URL(href, 'https://example.invalid');
    return url.protocol === 'http:' || url.protocol === 'https:' ? href : null;
  } catch {
    return null;
  }
};
