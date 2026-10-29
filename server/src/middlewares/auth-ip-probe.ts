import type { Core } from '@strapi/strapi';

const HEADERS = ['x-forwarded-for', 'x-real-ip', 'x-vercel-forwarded-for', 'forwarded', 'cf-connecting-ip', 'true-client-ip'];
const MAX_LINES = 20;

/**
 * B-9 diagnostic, off unless AUTH_IP_PROBE=true: for the first 20 requests to /api/auth/* per process, logs which
 * client-IP headers arrived and how many comma-separated entries each held. Never the values (they're personal data).
 */
export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  let lines = 0;
  return async (ctx: any, next: () => Promise<void>) => {
    if (process.env.AUTH_IP_PROBE === 'true' && lines < MAX_LINES && ctx.path.startsWith('/api/auth/')) {
      lines += 1;
      const shape = HEADERS.map((h) => {
        const v = ctx.request.headers[h];
        return `${h}=${typeof v === 'string' ? v.split(',').filter((s: string) => s.trim()).length : 'absent'}`;
      }).join(' ');
      strapi.log.info(`[matfinder] auth ip probe ${lines}/${MAX_LINES}: ${ctx.path} ${shape}`);
    }
    await next();
  };
};
