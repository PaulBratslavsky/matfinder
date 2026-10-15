/** Service outcomes the admin and content API map to HTTP (maison's ServiceResult, trimmed). */
export type ServiceError = { ok: false; code: string; status: number; message: string };
export type ServiceResult<T> = { ok: true; value: T } | ServiceError;

export const ok = <T>(value: T): ServiceResult<T> => ({ ok: true, value });
export const fail = (status: number, code: string, message: string): ServiceError => ({ ok: false, status, code, message });

/** Writes a ServiceResult as a Strapi-style response: the value, or `{ data: null, error: { status, name, message } }`. */
export function reply<T>(ctx: any, result: ServiceResult<T>, created = false) {
  // Explicit casts: the plugin's tsconfig isn't strict, so `result.ok` doesn't narrow the union.
  if (result.ok === false) {
    const e = result as ServiceError;
    ctx.status = e.status;
    ctx.body = { data: null, error: { status: e.status, name: e.code, message: e.message } };
    return;
  }
  ctx.status = created ? 201 : 200;
  ctx.body = (result as { ok: true; value: T }).value;
}
