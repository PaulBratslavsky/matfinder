import type { RawError } from '../gym-chat/errors';

/**
 * What an admin reads when the assistant can't answer. Admins run MatFinder, so a refused key or an unknown model says
 * which setting to check; the provider's own text still never reaches the browser (it goes to the log, key removed).
 */
export const ADMIN_ERRORS = {
  not_ready: "The assistant isn't set up: AI_API_KEY is empty. Set it in server/.env (or on Strapi Cloud) and restart Strapi.",
  no_message: 'Type a message.',
  message_too_long: 'That message is too long: 4,000 characters at most.',
  chat_too_long: 'This chat is long. Start a new chat.',
  already_decided: 'That change was already approved or denied.',
  timeout: 'The assistant took too long and stopped. Try again.',
  busy: 'Anthropic is busy. Try again in a minute.',
  key: 'Anthropic refused the key. Check AI_API_KEY.',
  model: "Anthropic doesn't know the model in AI_ADMIN_CHAT_MODEL. Check it.",
  internal: 'Something went wrong. Try again.',
} as const;

export type AdminErrorCode = keyof typeof ADMIN_ERRORS;

const BUSY = new Set(['429', '529', 'rate_limit_error', 'overloaded_error']);
const KEY = new Set(['401', '403', 'authentication_error', 'permission_error']);
const MODEL = new Set(['404', 'not_found_error']);

/** The admin's words for a raw error: our codes as they are, the provider's codes by what an admin can do about them. */
export function adminErrorOf(raw: RawError): { code: AdminErrorCode; message: string } {
  const code = raw.code == null ? '' : String(raw.code);
  const as = (c: AdminErrorCode) => ({ code: c, message: ADMIN_ERRORS[c] });
  if (code in ADMIN_ERRORS) return as(code as AdminErrorCode);
  if (BUSY.has(code)) return as('busy');
  if (KEY.has(code)) return as('key');
  if (MODEL.has(code)) return as('model');
  return as('internal');
}
