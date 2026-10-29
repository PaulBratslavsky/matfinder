import type { Core } from '@strapi/strapi';

type IndexSpec = { sql: string; unique: boolean };

/**
 * `"schema"."table"` on Postgres (DATABASE_SCHEMA, default `public`); the bare name on SQLite, which has no
 * schemas. Raw SQL doesn't get Strapi's schema handling, so the name is qualified here.
 */
export function tableRef(strapi: Core.Strapi): (table: string) => string {
  const schema = strapi.db.getSchemaName();
  if (!schema) return (table) => table;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
    throw new Error(`[matfinder] DATABASE_SCHEMA "${schema}" must be a plain identifier (letters, digits, _).`);
  }
  return (table) => `"${schema}"."${table}"`;
}

/**
 * `unique: true` in a schema is validation-layer only, and Document Service writes bypass it, so slugs get real
 * indexes. Draft-and-publish keeps a draft and a published row per document with the same slug, so only draft rows
 * are indexed (exactly one per document). City has no draft-and-publish, so it gets a plain index.
 */
export const indexes = (t: (table: string) => string): IndexSpec[] => [
  { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS schools_slug_draft_uq ON ${t('schools')} (slug) WHERE published_at IS NULL` },
  { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS instructors_slug_draft_uq ON ${t('instructors')} (slug) WHERE published_at IS NULL` },
  { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS affiliations_slug_draft_uq ON ${t('affiliations')} (slug) WHERE published_at IS NULL` },
  { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS cities_slug_uq ON ${t('cities')} (slug)` },
  // Better Auth checks for an existing email and then inserts; the index closes the race between two sign-ups.
  { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS ba_user_email_uq ON ${t('ba_user')} (email)` },
  // At most one accepted claim (owner) per gym, and one open claim per person per gym (B-5).
  { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS matfinder_claims_accepted_uq ON ${t('matfinder_claims')} (school_document_id) WHERE status = 'accepted'` },
  { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS matfinder_claims_open_uq ON ${t('matfinder_claims')} (school_document_id, user_id) WHERE status IN ('pending', 'contacted')` },
  // Not unique: the nearby query's bounding box (plan 08, M14) on the columns mirrored from `location`.
  { unique: false, sql: `CREATE INDEX IF NOT EXISTS schools_lat_lng_idx ON ${t('schools')} (latitude, longitude)` },
];

/**
 * Creates the indexes. A failed UNIQUE index means uniqueness isn't enforced, so in production Strapi refuses to
 * start (the same idea as assertMatFinderBuilt in config/plugins.ts); elsewhere it's logged. A failed plain index
 * is only logged. Only Postgres and SQLite are supported: the indexes are partial (`WHERE …`).
 */
export async function createIndexes(strapi: Core.Strapi): Promise<void> {
  const client = strapi.db.getInfo().client;
  if (client !== 'postgres' && client !== 'sqlite') {
    throw new Error(`[matfinder] DATABASE_CLIENT "${client}" isn't supported: MatFinder's unique indexes need partial indexes (Postgres or SQLite).`);
  }
  const failed: string[] = [];
  for (const { sql, unique } of indexes(tableRef(strapi))) {
    try {
      await strapi.db.connection.raw(sql);
    } catch (e) {
      strapi.log.error(`[matfinder] index failed: ${sql}`, e);
      if (unique) failed.push(sql);
    }
  }
  if (failed.length && process.env.NODE_ENV === 'production') {
    throw new Error(
      `[matfinder] ${failed.length} unique index(es) failed, so uniqueness isn't enforced. Refusing to start. ` +
        `Remove the duplicate rows named in the errors above, then deploy again.`,
    );
  }
}
