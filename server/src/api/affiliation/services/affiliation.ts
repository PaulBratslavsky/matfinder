/**
 * affiliation service
 */

import { factories } from '@strapi/strapi';
import { normalizeWebsite } from '../../../document-middlewares/normalize-contact';
import { upsertScalarDraft, type UpsertResult } from '../../../lib/upsert';

export type UpsertAffiliationInput = { slug?: string; name?: string; website?: string | null };

export default factories.createCoreService('api::affiliation.affiliation', ({ strapi }) => ({
  /** Create or partially update an affiliation DRAFT (the `upsert_affiliation` tool). */
  async upsertDraft(input: UpsertAffiliationInput): Promise<UpsertResult> {
    return upsertScalarDraft(
      strapi,
      {
        uid: 'api::affiliation.affiliation',
        type: 'affiliation',
        fields: ['name', 'website'],
        requiredOnCreate: ['name'],
        normalize: { website: normalizeWebsite },
      },
      input,
    );
  },
}));
