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

/**
 * The first slug not in `taken`: `base`, then `base-<citySlug>` (unless `base` already ends with it), then that
 * with `-2`, `-3`… Used when creating a school, so a name already listed (in any city) never selects that school.
 */
export function pickFreeSlug(base: string, citySlug: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  const withCity = base === citySlug || base.endsWith(`-${citySlug}`) ? base : `${base}-${citySlug}`;
  if (!taken.has(withCity)) return withCity;
  for (let n = 2; ; n++) {
    const candidate = `${withCity}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}
