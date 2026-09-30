import { writeData, type DocumentMiddleware } from './utils';

/** `@handle`, `instagram.com/handle/?igsh=…` and `handle` all become `handle`. */
export function normalizeInstagram(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  const url = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#\s]+)/i.exec(trimmed);
  return (url ? url[1] : trimmed).replace(/^@+/, '').replace(/\/+$/, '');
}

/** Adds `https://` when a website has no scheme. */
export function normalizeWebsite(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed && !/^https?:\/\//i.test(trimmed) ? `https://${trimmed}` : trimmed;
}

export const normalizeContact: DocumentMiddleware = async (ctx, next) => {
  const data = writeData(ctx);
  if (data && ctx.uid === 'api::school.school' && data.contact && typeof data.contact === 'object') {
    if ('instagram' in data.contact) data.contact.instagram = normalizeInstagram(data.contact.instagram);
    if ('website' in data.contact) data.contact.website = normalizeWebsite(data.contact.website);
  }
  if (data && ctx.uid === 'api::affiliation.affiliation' && 'website' in data) {
    data.website = normalizeWebsite(data.website);
  }
  return next();
};
