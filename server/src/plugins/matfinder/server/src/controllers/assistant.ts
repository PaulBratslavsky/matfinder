import { Readable } from 'node:stream';
import type { Core } from '@strapi/strapi';
import { getConfig } from '../config';
import { withoutKey } from '../gym-chat/errors';

const isBadBody = (error: unknown) => error instanceof Error && /is not a valid AG-UI RunAgentInput/.test(error.message);
const NO_ABILITY = { can: () => false };

/** Admin API: the Assistant tab's status and one chat turn, streamed. Both need assistant.use (routes/index.ts). */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  const service = () => strapi.plugin('matfinder').service('assistant');

  /** Server-sent events to Koa as a Node stream, with the headers that keep a proxy from buffering them. */
  const send = (ctx: any, response: Response) => {
    if (!response.body) return ctx.internalServerError('The assistant gave no answer.');
    ctx.status = 200;
    ctx.set('Content-Type', 'text/event-stream; charset=utf-8');
    ctx.set('Cache-Control', 'no-cache, no-transform');
    ctx.set('Connection', 'keep-alive');
    ctx.set('X-Accel-Buffering', 'no');
    ctx.body = Readable.fromWeb(response.body as never);
  };

  return {
    /** GET /matfinder/assistant/status: `{ ready, model, tools: [{ name, label, write }] }` or `{ ready: false, reason }`. Never the key. */
    async status(ctx: any) {
      ctx.body = service().status(ctx.state.userAbility ?? NO_ABILITY);
    },

    /** POST /matfinder/assistant/chat: the whole chat each turn (an AG-UI run input), or the approvals for a paused one. */
    async chat(ctx: any) {
      if (!service().ready()) return send(ctx, service().errorResponse('not_ready'));
      let params;
      try {
        params = await service().parseBody(ctx.request.body);
      } catch (error) {
        if (isBadBody(error)) return ctx.badRequest((error as Error).message);
        strapi.log.error(withoutKey(`[matfinder] assistant could not read a request: ${(error as Error)?.message ?? error}`, getConfig(strapi).aiApiKey));
        return send(ctx, service().errorResponse('internal'));
      }
      const responseController = new AbortController();
      const stopIfClosed = () => {
        if (!ctx.res.writableEnded) responseController.abort();
      };
      ctx.res.once('close', stopIfClosed);
      if (ctx.res.destroyed) stopIfClosed();
      return send(ctx, await service().turn(params, { ability: ctx.state.userAbility ?? NO_ABILITY, admin: ctx.state.user ?? null, responseController }));
    },
  };
};
