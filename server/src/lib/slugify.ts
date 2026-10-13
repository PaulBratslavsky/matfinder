import { randomBytes } from 'node:crypto';

/** Lowercase, strip accents, non-alphanumerics → `-`, trim `-`. May return ''. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `slugify(input)`, or `<type>-<6 random chars>` when that comes out empty. */
export function slugifyWithFallback(input: string, type: string): string {
  return slugify(input) || `${type}-${randomBytes(4).toString('hex').slice(0, 6)}`;
}
