import { slugifyWithFallback } from '../lib/slugify';
import { writeData, type DocumentMiddleware } from './utils';

/** Content types filtered by slug, and the prefix used when a name slugifies to nothing. */
const SLUG_TYPES: Record<string, string> = {
  'api::school.school': 'school',
  'api::instructor.instructor': 'instructor',
  'api::affiliation.affiliation': 'affiliation',
  'api::city.city': 'city',
};

/**
 * `uid` fields are only auto-filled by the admin, so API, Document Service and seed creates get their slug here.
 * Only on create: renaming a document keeps its slug (and its URLs).
 */
export const slug: DocumentMiddleware = async (ctx, next) => {
  const type = SLUG_TYPES[ctx.uid];
  const data = type && ctx.action === 'create' ? writeData(ctx) : undefined;
  if (data) data.slug ??= slugifyWithFallback(String(data.name ?? ''), type);
  return next();
};
