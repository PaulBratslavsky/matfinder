import { Readable } from 'node:stream';
import type { Core } from '@strapi/strapi';
import { getConfig } from '../config';
import { withoutKey } from '../gym-chat/errors';

/** The signed-in Better Auth user (api-permissions puts it on ctx.state.user). */
const userOf = (ctx: any) => ctx.state.user ?? ctx.state.auth?.credentials?.user ?? null;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * What `chatParamsFromRequestBody` says when the body is no run input. Its error has no name of its own to tell it by,
 * so the check is on the SDK's sentence (the bad-body integration test runs the real parser).
 */
const isBadBody = (error: unknown) => error instanceof Error && /is not a valid AG-UI RunAgentInput/.test(error.message);

/** Content API (the app): ask about one gym, and whether the gym chat is set up. Signed-in users only. */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  const service = () => strapi.plugin('matfinder').service('gym-chat');

  /**
   * Sends a service answer as server-sent events. Koa can't send a web stream (the browser would get `{}`), so it goes as
   * a Node stream. The headers keep a proxy from buffering or compressing it, which would show as a slow answer.
   */
  const send = (ctx: any, response: Response) => {
    if (!response.body) return ctx.internalServerError('The gym chat gave no answer.');
    ctx.status = 200;
    ctx.set('Content-Type', 'text/event-stream; charset=utf-8');
    ctx.set('Cache-Control', 'no-cache, no-transform');
    ctx.set('Connection', 'keep-alive');
    ctx.set('X-Accel-Buffering', 'no');
    ctx.body = Readable.fromWeb(response.body as never);
  };

  return {
    /** GET /api/matfinder/chat/status → `{ ready }`. The app shows "Ask about this gym" only when it's true. */
    async status(ctx: any) {
      ctx.body = { ready: service().ready() };
    },

    /**
     * POST /api/matfinder/schools/:slug/chat: one question, streamed. The app sends the whole chat each time (an AG-UI
     * run input). Only a body that's no run input is an HTTP error (400); the rest are RUN_ERRORs in the stream.
     */
    async ask(ctx: any) {
      const user = userOf(ctx);
      if (!user?.documentId) return ctx.unauthorized('Sign in to ask about a gym');
      const slug = String(ctx.params.slug ?? '');
      if (!SLUG.test(slug) || slug.length > 255) return ctx.badRequest('Not a gym slug');
      if (!service().ready()) return send(ctx, service().errorResponse('not_ready'));

      let params;
      try {
        params = await service().parseBody(ctx.request.body);
      } catch (error) {
        if (isBadBody(error)) return ctx.badRequest((error as Error).message);
        strapi.log.error(withoutKey(`[matfinder] gym chat could not read a request: ${(error as Error)?.message ?? error}`, getConfig(strapi).aiApiKey));
        return send(ctx, service().errorResponse('internal'));
      }

      // Aborted only when the response closes before it ends (a closed screen, or Stop); the model call stops then.
      const responseController = new AbortController();
      const stopIfClosed = () => {
        if (!ctx.res.writableEnded) responseController.abort();
      };
      ctx.res.once('close', stopIfClosed);
      if (ctx.res.destroyed) stopIfClosed();

      return send(ctx, await service().turn(params, { userKey: user.documentId, slug, responseController }));
    },
  };
};
