import { beltRank, slug, upsertOutput, z } from '../schemas';
import type { ToolDef } from '../types';

export const upsertInstructor: ToolDef = {
  name: 'upsert_instructor',
  title: 'Create or update an instructor',
  description:
    'Create or partially update an instructor, published right away. Only send the fields you want to change. Without a slug (or with an unknown one) it creates an instructor, which needs name and beltRank. Call list_reference_data first to reuse an existing instructor. Link instructors to schools with upsert_school.headInstructorSlugs.',
  write: true,
  publishes: 'api::instructor.instructor',
  input: z.object({
    slug: slug.optional(),
    name: z.string().min(1).max(120).optional(),
    beltRank: beltRank.optional(),
    degree: z.number().int().min(0).max(10).nullable().optional(),
    bio: z.string().max(1000).nullable().optional(),
  }),
  output: upsertOutput,
  shrinkHint: 'The result is too large.',
  run: (strapi, args) => (strapi.service('api::instructor.instructor') as any).upsertDraft(args),
};
