/**
 * instructor service
 */

import { factories } from '@strapi/strapi';
import { upsertScalarDraft, type UpsertResult } from '../../../lib/upsert';

export type UpsertInstructorInput = { slug?: string; name?: string; beltRank?: string; degree?: number | null; bio?: string | null };

export default factories.createCoreService('api::instructor.instructor', ({ strapi }) => ({
  /** Create or partially update an instructor DRAFT (the `upsert_instructor` tool). */
  async upsertDraft(input: UpsertInstructorInput): Promise<UpsertResult> {
    return upsertScalarDraft(
      strapi,
      { uid: 'api::instructor.instructor', type: 'instructor', fields: ['name', 'beltRank', 'degree', 'bio'], requiredOnCreate: ['name', 'beltRank'] },
      input,
    );
  },
}));
