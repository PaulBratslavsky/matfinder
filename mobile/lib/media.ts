import { apiBase } from './api/client';

/** Strapi media URLs are absolute on Strapi Cloud and relative (`/uploads/…`) locally. */
export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\//.test(url) ? url : `${apiBase()}${url}`;
}
