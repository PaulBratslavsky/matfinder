// Tool schemas use Strapi's own zod instance (@strapi/utils ships zod 4.4 in Strapi 5.58). A bare 'zod' import would
// resolve to a different copy: the top-level zod pinned for the Better Auth dashboard.
import { z } from '@strapi/utils';
// The content model stays in the app (server/src); its enums are bundled in from there, so they can't drift.
import instructor from '../../../../../api/instructor/content-types/instructor/schema.json';
import session from '../../../../../components/schedule/session.json';

const oneOf = (values: string[]) => z.enum(values as [string, ...string[]]);

export const day = oneOf(session.attributes.day.enum);
export const classType = oneOf(session.attributes.classType.enum);
export const style = oneOf(session.attributes.style.enum);
export const beltRank = oneOf(instructor.attributes.beltRank.enum);
export const draftStatus = z.enum(['published', 'unpublished-changes', 'never-published']);

/** A Strapi `string` field (255-character app-layer max). */
export const str = z.string().max(255);
/** Lowercase words joined by hyphens, as slugify() makes them. An unknown slug means "create", so a malformed one would add a duplicate. */
export const slug = z
  .string()
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase letters, digits and hyphens, e.g. summerlin-bjj');
export const hhmm = z.string().regex(/^\d{2}:\d{2}$/, 'HH:mm, 24-hour');
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

/** Relations are returned as names and slugs, never bare ids. */
export const ref = z.object({ slug: z.string(), name: z.string() });

export const upsertOutput = z.object({
  documentId: z.string(),
  slug: z.string(),
  created: z.boolean(),
  changedFields: z.array(z.string()),
  status: draftStatus,
  notPublishedBecause: z.string().optional(),
});

/** Added to every write's result: published means it's live in the app. */
export const liveOutput = { status: draftStatus, notPublishedBecause: z.string().optional() };

export const sessionOut = z.object({
  day,
  start: z.string(),
  end: z.string(),
  classType,
  style,
  notes: z.string().nullable(),
});

export { z };
