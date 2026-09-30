import { ref, beltRank, z } from '../schemas';
import { schoolService, type ToolDef } from '../types';

export const listReferenceData: ToolDef = {
  name: 'list_reference_data',
  title: 'List reference data',
  description:
    'List the cities, affiliations (teams) and instructors that already exist, as names and slugs. Call this first, before creating anything, so you reuse existing records instead of creating duplicates.',
  write: false,
  input: z.object({}),
  output: z.object({
    cities: z.array(ref),
    affiliations: z.array(ref),
    instructors: z.array(ref.extend({ beltRank })),
  }),
  shrinkHint: 'The reference data is too large to return in one call.',
  run: (strapi) => schoolService(strapi).referenceData(),
};
