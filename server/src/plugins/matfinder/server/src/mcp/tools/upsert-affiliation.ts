import { slug, upsertOutput, urlText, z } from '../schemas';
import type { ToolDef } from '../types';

export const upsertAffiliation: ToolDef = {
  name: 'upsert_affiliation',
  title: 'Create or update an affiliation',
  description:
    'Create or partially update an affiliation (a BJJ team or association, e.g. a school network), published right away. Only send the fields you want to change. Without a slug (or with an unknown one) it creates one, which needs name. Call list_reference_data first to reuse an existing affiliation. Link a school to it with upsert_school.affiliationSlug.',
  write: true,
  publishes: 'api::affiliation.affiliation',
  input: z.object({ slug: slug.optional(), name: z.string().min(1).max(80).optional(), website: urlText.nullable().optional() }),
  output: upsertOutput,
  shrinkHint: 'The result is too large.',
  run: (strapi, args) => (strapi.service('api::affiliation.affiliation') as any).upsertDraft(args),
};
