import type { Core } from '@strapi/strapi';
import { registerDocumentMiddlewares } from './document-middlewares';

/**
 * `unique: true` in a schema is validation-layer only, and Document Service writes bypass it, so slugs get real
 * indexes. Draft-and-publish keeps a draft and a published row per document with the same slug, so only draft rows
 * are indexed (exactly one per document). City has no draft-and-publish, so it gets a plain index.
 */
const UNIQUE_INDEXES = [
  `CREATE UNIQUE INDEX IF NOT EXISTS schools_slug_draft_uq ON schools (slug) WHERE published_at IS NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS instructors_slug_draft_uq ON instructors (slug) WHERE published_at IS NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS affiliations_slug_draft_uq ON affiliations (slug) WHERE published_at IS NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS cities_slug_uq ON cities (slug)`,
];

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    registerDocumentMiddlewares(strapi);
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    for (const sql of UNIQUE_INDEXES) {
      try {
        await strapi.db.connection.raw(sql);
      } catch (e) {
        strapi.log.error(`[matfinder] index failed: ${sql}`, e);
      }
    }
  },
};
