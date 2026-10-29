/** What a person reads when the gym chat can't answer. The provider's own error text never reaches them. */
export const PERSON_ERRORS = {
  not_ready: "Ask about this gym isn't available right now.",
  not_found: "We couldn't find this gym.",
  no_question: 'Type a question about this gym.',
  question_too_long: 'That question is too long. Keep it under 500 characters.',
  chat_too_long: 'This chat is long. Start a new one to keep asking.',
  daily_limit: "You've asked a lot of questions today. Try again tomorrow.",
  service_limit: "Ask about this gym has reached today's limit. Try again tomorrow.",
  timeout: 'That took too long. Try again.',
  busy: 'Too many people are asking right now. Try again in a minute.',
  cut_off: 'The answer was cut off. Try a narrower question.',
  internal: 'Something went wrong. Try again.',
} as const;

export type PersonErrorCode = keyof typeof PERSON_ERRORS;
export type PersonError = { code: PersonErrorCode; message: string };
/** A RUN_ERROR as the SDK or the provider reports it. */
export type RawError = { code?: string | number | null; message?: string | null };

const BUSY = new Set(['429', '529', 'rate_limit_error', 'overloaded_error']);

/**
 * The person's text for a raw error. Our own codes pass through. A busy provider is "try again in a minute". A refused
 * key (401, 403) or an unknown model (404) is the operator's problem, logged by the caller, and reads as "something
 * went wrong".
 */
export function personErrorOf(raw: RawError): PersonError {
  const code = raw.code == null ? '' : String(raw.code);
  if (code in PERSON_ERRORS) return { code: code as PersonErrorCode, message: PERSON_ERRORS[code as PersonErrorCode] };
  if (BUSY.has(code)) return { code: 'busy', message: PERSON_ERRORS.busy };
  return { code: 'internal', message: PERSON_ERRORS.internal };
}

/** A text with the key taken out, for the log. */
export const withoutKey = (text: string, key: string | null) => (key ? text.split(key).join('[AI_API_KEY]') : text);
