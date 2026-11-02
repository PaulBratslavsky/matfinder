import type { Core } from '@strapi/strapi';
import { anthropicAdapter, loadSdk, scriptedAdapter, toTools, type ChatAdapter, type ChatParams } from '../ai/sdk';
import { ADMIN_ERRORS, adminErrorOf, type AdminErrorCode } from '../assistant/errors';
import { assistantInstructions } from '../assistant/instructions';
import { ASSISTANT_LIMITS, checkChat, Decisions, onlyConversation } from '../assistant/limits';
import { scriptedAssistant } from '../assistant/scripted';
import { LIMITS, toolsFor, type Ability, type AssistantTool } from '../assistant/tools';
import { getConfig } from '../config';
import { withoutKey } from '../gym-chat/errors';
import { errorChunk, wrapStream, type Chunk } from '../gym-chat/stream';

const SSE_HEADERS = { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' };

export type TurnRequest = {
  ability: Ability;
  /** The admin user: recorded as handledBy on claims, and its id in the log. */
  admin: { id?: number; firstname?: string; lastname?: string; username?: string; email?: string } | null;
  /** Aborted only when the response closes early (Stop, or the tab closed): the model call stops then. */
  responseController: AbortController;
  /** Tests: the adapter to use instead of the configured one. */
  adapter?: ChatAdapter;
  now?: Date;
};

/** A tool that never throws: a service failure is logged and the model reads a fixed answer, never database text. */
function guarded(tool: AssistantTool, admin: TurnRequest['admin'], onFailure: (name: string, error: unknown) => void) {
  return async (args: unknown) => {
    try {
      const result = await tool.execute(args, admin);
      const text = JSON.stringify(result ?? null);
      if (text.length > LIMITS.resultChars) {
        return { error: { code: 'result_too_large', message: 'That answer is too large to read.', hint: 'Ask for less: a filter, one gym, or fewer rows.' } };
      }
      return result;
    } catch (error) {
      onFailure(tool.name, error);
      return { error: { code: 'tool_failed', message: 'MatFinder could not do that just now.', hint: 'Tell the admin it failed and suggest trying again. Do not guess the result.' } };
    }
  };
}

/** An admin's answer to a paused change, for the log: approved, denied, or how the pause ended otherwise. */
const decisionOf = (r: { status: string; payload?: unknown }) =>
  r.status !== 'resolved' ? r.status : (r.payload as { approved?: unknown } | undefined)?.approved === true ? 'approved' : 'denied';

/** The MatFinder assistant (plan 09, M19): ported from the maison plugin's, with writes that wait for an approval. */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  const ready = () => {
    const config = getConfig(strapi);
    return config.aiScripted || Boolean(config.aiApiKey);
  };
  const decisions = new Decisions();

  /** A 200 event stream with one RUN_ERROR in the admin's words (`@tanstack/ai-client` doesn't read HTTP error bodies). */
  const errorResponse = (code: AdminErrorCode): Response =>
    new Response(`data: ${JSON.stringify(errorChunk({ code, message: ADMIN_ERRORS[code] }))}\n\n`, { status: 200, headers: SSE_HEADERS });

  return {
    ready,
    errorResponse,

    /** GET /assistant/status for one admin: the model and the tools their role allows, or why it isn't set up. */
    status(ability: Ability) {
      const config = getConfig(strapi);
      if (!ready()) return { ready: false as const, reason: ADMIN_ERRORS.not_ready };
      const tools = toolsFor(strapi, ability).map(({ name, label, write }) => ({ name, label, write }));
      return { ready: true as const, model: config.aiScripted ? 'scripted (test server)' : config.adminChatModel, tools };
    },

    async parseBody(body: unknown): Promise<ChatParams> {
      const { chatParamsFromRequestBody } = await loadSdk();
      return chatParamsFromRequestBody(body);
    },

    /** One turn, streamed: a new message, or the admin's approval decisions (`resume`) for a paused one. */
    async turn(params: ChatParams, request: TurnRequest): Promise<Response> {
      const config = getConfig(strapi);
      if (!ready() && !request.adapter) return errorResponse('not_ready');
      const messages = onlyConversation(params.messages as any[]);
      const problem = checkChat(messages);
      if (problem) return errorResponse(problem);
      if (params.resume?.length && !decisions.takeOnce(params.threadId, params.resume.map((r: { interruptId: string }) => r.interruptId))) {
        return errorResponse('already_decided');
      }

      try {
        const { chat, maxIterations, toServerSentEventsResponse } = await loadSdk();
        const logFailure = (name: string, error: unknown) =>
          strapi.log.error(withoutKey(`[matfinder] assistant tool ${name} failed: ${error instanceof Error ? error.message : String(error)}`, config.aiApiKey));
        const allowed = toolsFor(strapi, request.ability);
        const tools = await toTools(
          allowed.map((t) => ({ name: t.name, description: t.description, input: t.input, write: t.write, execute: guarded(t, request.admin, logFailure) })),
        );
        const adapter =
          request.adapter ??
          (config.aiScripted ? await scriptedAdapter(scriptedAssistant) : await anthropicAdapter(config.adminChatModel, config.aiApiKey as string));

        const chatController = new AbortController();
        const stream = chat({
          adapter,
          stream: true,
          messages,
          threadId: params.threadId,
          runId: params.runId,
          // An approval comes back as `resume` on the paused run (`parentRunId`); chat() rebuilds the paused tool call
          // from the history and runs it only if it was approved.
          ...(params.parentRunId ? { parentRunId: params.parentRunId } : {}),
          ...(params.resume ? { resume: params.resume } : {}),
          systemPrompts: [assistantInstructions({ today: request.now ?? new Date(), tools: allowed })],
          ...(tools.length ? { tools } : {}),
          agentLoopStrategy: maxIterations(ASSISTANT_LIMITS.modelTurns),
          abortController: chatController,
          debug: false,
          modelOptions: { max_tokens: ASSISTANT_LIMITS.maxTokens, output_config: { effort: 'medium' } },
        } as never) as unknown as AsyncIterable<Chunk>;

        const wrapped = wrapStream(stream, {
          describe: adminErrorOf,
          deadlineMs: ASSISTANT_LIMITS.deadlineMs,
          chatController,
          responseSignal: request.responseController.signal,
          onSourceError: (raw) =>
            strapi.log.error(withoutKey(`[matfinder] assistant model call failed (${raw.code ?? 'no code'}): ${raw.message ?? 'no message'}`, config.aiApiKey)),
          onDone: ({ ms, tools: called, paused, failed, usage }) =>
            strapi.log.info(
              `[matfinder] assistant: admin ${request.admin?.id ?? 'unknown'}, tools ${called.length ? called.join(', ') : 'none'}` +
                `${params.resume ? `, decisions ${params.resume.map(decisionOf).join(', ')}` : ''}` +
                `${paused ? ', waiting for approval' : ''}${failed ? ', failed' : ''}, ${ms} ms, usage ${JSON.stringify(usage)}`,
            ),
        });
        return toServerSentEventsResponse(wrapped as never, { abortController: request.responseController });
      } catch (error) {
        strapi.log.error(withoutKey(`[matfinder] assistant could not start a turn: ${error instanceof Error ? error.message : String(error)}`, config.aiApiKey));
        return errorResponse('internal');
      }
    },
  };
};
