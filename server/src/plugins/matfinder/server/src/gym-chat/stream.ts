import { personErrorOf, type PersonError, type RawError } from './errors';

/** One event of the stream `chat()` gives (AG-UI), with the fields read here. */
export type Chunk = { type: string; [field: string]: any };

/** Events the wrapper adds, which the app turns into a note under the answer. */
export const CUSTOM_EVENTS = { declined: 'declined', cutOff: 'cut_off' } as const;

export type TurnSummary = { ms: number; finishReason: string | null; usage: unknown; failed: boolean };

export type WrapOptions = {
  /** Called once per error the source reports or throws, with the original, before it's rewritten for the person. */
  onSourceError?: (raw: RawError) => void;
  /** Called once when the stream ends, however it ends. */
  onDone?: (summary: TurnSummary) => void;
  deadlineMs: number;
  /** Held only by `chat()` and this wrapper: aborting it stops the model call. */
  chatController: AbortController;
  /** The response's signal: when it aborts (a closed tab, or Stop), the model call stops at once. */
  responseSignal: AbortSignal;
};

const TIMED_OUT = Symbol('timed out');
const CLOSED = Symbol('closed');

const finishReasonOf = (chunk: Chunk): string | null => chunk.finishReason ?? chunk.metadata?.tanstack?.finishReason ?? null;
const custom = (name: string): Chunk => ({ type: 'CUSTOM', name, value: {}, timestamp: Date.now() });

/** A RUN_ERROR with the person's text and code only: nothing the provider wrote is copied. */
export const errorChunk = (error: PersonError): Chunk => ({
  type: 'RUN_ERROR',
  timestamp: Date.now(),
  message: error.message,
  code: error.code,
  error: { message: error.message, code: error.code },
});

const quietly = (run: () => void) => {
  try {
    run();
  } catch {
    // A failed log line never breaks an answer.
  }
};

/**
 * The stream `chat()` gives, made safe to send to a person (after the maison plugin's `wrapStream`):
 * - a RUN_ERROR, or a throw, becomes one RUN_ERROR in plain words and ends the stream; the original goes to `onSourceError`;
 * - the whole answer has `deadlineMs`; past it the stream ends with a `timeout` RUN_ERROR and the model call stops;
 * - a turn that ends with "stop" and no text is a refusal: a `declined` event follows it; one that ends with "length"
 *   gets a `cut_off` event.
 */
export async function* wrapStream(source: AsyncIterable<Chunk>, options: WrapOptions): AsyncGenerator<Chunk> {
  const { onSourceError, onDone, deadlineMs, chatController, responseSignal } = options;
  const startedAt = Date.now();
  const iterator = source[Symbol.asyncIterator]();
  let signalClosed: () => void = () => {};
  const closed = new Promise<typeof CLOSED>((resolve) => (signalClosed = () => resolve(CLOSED)));
  const onClose = () => {
    chatController.abort();
    signalClosed();
  };
  if (responseSignal.aborted) onClose();
  else responseSignal.addEventListener('abort', onClose, { once: true });

  let timer: ReturnType<typeof setTimeout> | undefined;
  let sourceDone = false;
  let sawText = false;
  let finishReason: string | null = null;
  let usage: unknown = null;
  let failed = false;
  const fail = (raw: RawError): Chunk => {
    failed = true;
    if (onSourceError) quietly(() => onSourceError(raw));
    return errorChunk(personErrorOf(raw));
  };

  try {
    while (true) {
      const remaining = startedAt + deadlineMs - Date.now();
      let step: IteratorResult<Chunk> | typeof TIMED_OUT | typeof CLOSED;
      try {
        step =
          remaining <= 0
            ? TIMED_OUT
            : await Promise.race([iterator.next(), closed, new Promise<typeof TIMED_OUT>((resolve) => (timer = setTimeout(() => resolve(TIMED_OUT), remaining)))]);
      } catch (error) {
        sourceDone = true;
        const thrown = error as { code?: unknown; status?: unknown; message?: unknown };
        yield fail({ code: (thrown?.code ?? thrown?.status ?? null) as string | null, message: String(thrown?.message ?? error) });
        return;
      } finally {
        clearTimeout(timer);
      }
      if (step === CLOSED) return;
      if (step === TIMED_OUT) {
        failed = true;
        chatController.abort();
        yield errorChunk(personErrorOf({ code: 'timeout' }));
        return;
      }
      if (step.done) {
        sourceDone = true;
        break;
      }
      const chunk = step.value;
      if (chunk.type === 'RUN_ERROR') {
        yield fail({ code: chunk.code ?? chunk.error?.code, message: chunk.message ?? chunk.error?.message });
        chatController.abort();
        return;
      }
      if (chunk.type === 'TEXT_MESSAGE_CONTENT' && typeof chunk.delta === 'string' && chunk.delta.trim()) sawText = true;
      yield chunk;
      if (chunk.type === 'RUN_FINISHED') {
        finishReason = finishReasonOf(chunk);
        usage = chunk.usage ?? null;
        if (finishReason === 'stop' && !sawText) yield custom(CUSTOM_EVENTS.declined);
        if (finishReason === 'length') yield custom(CUSTOM_EVENTS.cutOff);
      }
    }
  } finally {
    clearTimeout(timer);
    responseSignal.removeEventListener('abort', onClose);
    // A source still running is told to stop, not waited for.
    if (!sourceDone) quietly(() => void Promise.resolve(iterator.return?.()).catch(() => {}));
    if (onDone) quietly(() => onDone({ ms: Date.now() - startedAt, finishReason, usage, failed }));
  }
}
