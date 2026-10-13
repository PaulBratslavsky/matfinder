import type { Modules } from '@strapi/strapi';
import { errors } from '@strapi/utils';

export type DocumentMiddleware = Modules.Documents.Middleware.Middleware;
type Context = Modules.Documents.Middleware.Context;

export type Path = (string | number)[];

/**
 * The `data` of a create, update or clone call; undefined for every other action. Clone counts: the admin's
 * Duplicate sends the edited form as `data`, which must pass the same rules.
 */
export function writeData(ctx: Context): Record<string, any> | undefined {
  if (ctx.action !== 'create' && ctx.action !== 'update' && ctx.action !== 'clone') return undefined;
  const data = (ctx.params as { data?: unknown }).data;
  return data && typeof data === 'object' ? (data as Record<string, any>) : undefined;
}

/** Throw a `ValidationError` whose `details.path` points at the offending field. */
export function reject(message: string, path: Path): never {
  throw new errors.ValidationError(`${path.join('.')}: ${message}`, { path });
}
