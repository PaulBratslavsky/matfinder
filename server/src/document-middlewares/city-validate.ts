import { reject, writeData, type DocumentMiddleware } from './utils';

/** True for IANA time zone names the runtime knows, e.g. `America/Los_Angeles`. */
export function isTimeZone(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const cityValidate: DocumentMiddleware = async (ctx, next) => {
  const data = ctx.uid === 'api::city.city' ? writeData(ctx) : undefined;
  if (data && data.timezone != null && !isTimeZone(data.timezone)) {
    reject('must be an IANA time zone, e.g. America/Los_Angeles', ['timezone']);
  }
  return next();
};
