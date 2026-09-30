import type { Modules } from '@strapi/strapi';
import { errors } from '@strapi/utils';

export type DocumentMiddleware = Modules.Documents.Middleware.Middleware;
type Context = Modules.Documents.Middleware.Context;

export type Path = (string | number)[];

/** The `data` of a create or update call; undefined for every other action. */
export function writeData(ctx: Context): Record<string, any> | undefined {
  if (ctx.action !== 'create' && ctx.action !== 'update') return undefined;
  const data = (ctx.params as { data?: unknown }).data;
  return data && typeof data === 'object' ? (data as Record<string, any>) : undefined;
}

/** Throw a `ValidationError` whose `details.path` points at the offending field. */
export function reject(message: string, path: Path): never {
  throw new errors.ValidationError(`${path.join('.')}: ${message}`, { path });
}
