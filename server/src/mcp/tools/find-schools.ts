import { draftStatus, ref, str, z } from '../schemas';
import { schoolService, type ToolDef } from '../types';

export const findSchools: ToolDef = {
  name: 'find_schools',
  title: 'Find schools',
  description:
    'Search BJJ school listings (draft versions, with their publish status). Use it to check whether a school already exists before upsert_school, to find listings waiting for review, or to find stale listings with staleDays (lastVerifiedAt older than N days, or never verified). Paged: page (from 1) and limit (max 50).',
  write: false,
  input: z.object({
    search: str.optional().describe('Case-insensitive match on name, neighborhood or postal code'),
    city: str.optional().describe('City slug, e.g. las-vegas'),
    status: z.enum(['any', 'published', 'unpublished-changes', 'never-published']).default('any'),
    staleDays: z.number().int().min(0).max(3650).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  output: z.object({
    items: z.array(
      z.object({
        documentId: z.string(),
        slug: z.string(),
        name: z.string(),
        neighborhood: z.string().nullable(),
        city: ref.nullable(),
        affiliation: ref.nullable(),
        status: draftStatus,
        updatedAt: z.string(),
        lastVerifiedAt: z.string().nullable(),
      }),
    ),
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    hasMore: z.boolean(),
  }),
  shrinkHint: 'Too many results: lower limit or narrow the search.',
  run: (strapi, args) => schoolService(strapi).findSchools(args),
};
