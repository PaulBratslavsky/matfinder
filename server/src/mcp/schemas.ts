// Tool schemas use Strapi's own zod instance (@strapi/utils ships zod 4.4 in Strapi 5.56). A bare 'zod' import would
// resolve to a different copy: the top-level zod pinned for the Better Auth dashboard.
import { z } from '@strapi/utils';
import instructor from '../api/instructor/content-types/instructor/schema.json';
import session from '../components/schedule/session.json';

const oneOf = (values: string[]) => z.enum(values as [string, ...string[]]);

export const day = oneOf(session.attributes.day.enum);
export const classType = oneOf(session.attributes.classType.enum);
export const style = oneOf(session.attributes.style.enum);
export const beltRank = oneOf(instructor.attributes.beltRank.enum);
export const draftStatus = z.enum(['published', 'unpublished-changes', 'never-published']);

/** A Strapi `string` field (255-character app-layer max). */
export const str = z.string().max(255);
export const slug = z.string().min(1).max(255);
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
});

export const sessionOut = z.object({
  day,
  start: z.string(),
  end: z.string(),
  classType,
  style,
  notes: z.string().nullable(),
});

export { z };
