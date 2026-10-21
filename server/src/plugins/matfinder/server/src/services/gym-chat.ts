import type { Core } from '@strapi/strapi';
import { anthropicAdapter, loadSdk, scriptedAdapter, type ChatAdapter, type ChatParams, type ScriptedRequest } from '../ai/sdk';
import { getConfig } from '../config';
import type { KnowledgeEntry } from '../domain/knowledge';
import { gymContext, nowLine, type PublicGym } from '../gym-chat/context';
import { PERSON_ERRORS, withoutKey, type PersonErrorCode } from '../gym-chat/errors';
import { GYM_CHAT_INSTRUCTIONS } from '../gym-chat/instructions';
import { checkConversation, DailyCounter, GYM_CHAT_LIMITS, lastQuestion, messageText, onlyConversation } from '../gym-chat/limits';
import { errorChunk, wrapStream, type Chunk } from '../gym-chat/stream';

const KNOWLEDGE = 'plugin::matfinder.knowledge';

/** Server-sent events headers, also written by hand for an error answer (no SDK needed to say "not set up"). */
const SSE_HEADERS = { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' };

/**
 * The test server's answer: what the model would have been given, so integration and e2e tests can check the context.
 * Only with `aiScripted` (MATFINDER_AI_SCRIPTED), which production never sets.
 */
export function scriptedAnswer(request: ScriptedRequest): string {
  const system = (request.systemPrompts ?? []).map((p) => (typeof p === 'string' ? p : p.content)).join('\n\n');
  const users = request.messages.filter((m) => m.role === 'user');
  const question = users.length ? messageText(users[users.length - 1] as never) : '';
  return `Scripted answer (no model). You asked: ${question}\n\n--- What the model would read ---\n${system}`;
}

export type TurnRequest = {
  /** The signed-in user's documentId: the daily count's key, and the log's. Never the question text. */
  userKey: string;
  slug: string;
  /** Aborted only when the response closes early (a closed screen, or Stop): the model call stops then. */
  responseController: AbortController;
  /** Tests: the adapter to use instead of the configured one. */
  adapter?: ChatAdapter;
  now?: Date;
};

/** The gym chat: whether it's set up, and one question answered as a stream (plan 09, M17). */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  const daily = new DailyCounter(GYM_CHAT_LIMITS.questionsPerDay);

  const ready = () => {
    const config = getConfig(strapi);
    return config.aiScripted || Boolean(config.aiApiKey);
  };

  /**
   * A 200 event stream with one RUN_ERROR in the person's words. @tanstack/ai-client doesn't read the body of an HTTP
   * error, so a refusal sent as one would reach the person as a bare status.
   */
  const errorResponse = (code: PersonErrorCode): Response =>
    new Response(`data: ${JSON.stringify(errorChunk({ code, message: PERSON_ERRORS[code] }))}\n\n`, { status: 200, headers: SSE_HEADERS });

  /** The published entries for a gym, and the general ones (no gym). */
  async function knowledgeFor(schoolDocumentId: string): Promise<KnowledgeEntry[]> {
    const rows = await (strapi.documents(KNOWLEDGE as any) as any).findMany({
      status: 'published',
      filters: { $or: [{ school: { documentId: schoolDocumentId } }, { school: { id: { $null: true } } }] },
      fields: ['question', 'answer', 'category', 'updatedAt'],
      populate: { school: { fields: ['documentId'] } },
      sort: 'updatedAt:desc',
      limit: 500,
    });
    return rows.map((r: any) => ({ question: r.question, answer: r.answer, category: r.category, general: !r.school }));
  }

  return {
    ready,
    errorResponse,
    knowledgeFor,

    /** The request body as chat parameters. Throws when the body isn't an AG-UI run input (the controller's 400). */
    async parseBody(body: unknown): Promise<ChatParams> {
      const { chatParamsFromRequestBody } = await loadSdk();
      return chatParamsFromRequestBody(body);
    },

    /** One question, answered as a stream. Every failure reaches the person as a RUN_ERROR in the stream. */
    async turn(params: ChatParams, request: TurnRequest): Promise<Response> {
      const config = getConfig(strapi);
      if (!ready() && !request.adapter) return errorResponse('not_ready');

      const messages = onlyConversation(params.messages as any[]);
      const problem = checkConversation(messages);
      if (problem) return errorResponse(problem);

      const gym = (await strapi.service('api::school.school').getBySlug(request.slug)) as (PublicGym & { documentId: string }) | null;
      if (!gym) return errorResponse('not_found');
      if (!daily.take(request.userKey)) return errorResponse('daily_limit');

      try {
        const { chat, toServerSentEventsResponse } = await loadSdk();
        const context = gymContext(gym, await knowledgeFor(gym.documentId), { question: lastQuestion(messages) });
        const adapter =
          request.adapter ??
          (config.aiScripted ? await scriptedAdapter(scriptedAnswer) : await anthropicAdapter(config.gymChatModel, config.aiApiKey as string));

        // Held only by chat() and the wrapper, so the wrapper can send its timeout error before chat() is stopped.
        const chatController = new AbortController();
        const stream = chat({
          adapter,
          stream: true,
          messages,
          threadId: params.threadId,
          runId: params.runId,
          // The instructions and the gym are the same for every question about this gym: the cached start of the prompt.
          systemPrompts: [{ content: `${GYM_CHAT_INSTRUCTIONS}\n\n${context.text}`, metadata: { cache_control: { type: 'ephemeral' } } }, nowLine(gym.city?.timezone, request.now)],
          abortController: chatController,
          // The SDK's own logging would print the provider's errors without going through withoutKey.
          debug: false,
          modelOptions: { max_tokens: GYM_CHAT_LIMITS.maxTokens, output_config: { effort: 'low' } },
        } as never) as unknown as AsyncIterable<Chunk>;

        const wrapped = wrapStream(stream, {
          deadlineMs: GYM_CHAT_LIMITS.deadlineMs,
          chatController,
          responseSignal: request.responseController.signal,
          onSourceError: (raw) =>
            strapi.log.error(withoutKey(`[matfinder] gym chat model call failed (${raw.code ?? 'no code'}): ${raw.message ?? 'no message'}`, config.aiApiKey)),
          onDone: ({ ms, finishReason, usage, failed }) =>
            strapi.log.info(
              `[matfinder] gym chat: user ${request.userKey}, ${request.slug}, ${context.entries} entries${context.dropped ? ` (${context.dropped} cut)` : ''}, ` +
                `${failed ? 'failed' : (finishReason ?? 'no finish')}, ${ms} ms, usage ${JSON.stringify(usage)}`,
            ),
        });
        return toServerSentEventsResponse(wrapped as never, { abortController: request.responseController });
      } catch (error) {
        strapi.log.error(withoutKey(`[matfinder] gym chat could not start: ${error instanceof Error ? error.message : String(error)}`, config.aiApiKey));
        return errorResponse('internal');
      }
    },
  };
};
