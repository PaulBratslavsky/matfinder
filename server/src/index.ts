import type { Core } from '@strapi/strapi';
import { registerDocumentMiddlewares } from './document-middlewares';
import { backfillSchoolCoordinates } from './lib/coordinates';
import { createIndexes } from './lib/indexes';
import { backfillUserRoles, seedPermissions } from './lib/permissions';
import { seedSampleData } from './seed/sample';

export default {
  async register({ strapi }: { strapi: Core.Strapi }) {
    registerDocumentMiddlewares(strapi);
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Unique indexes (lib/indexes.ts). In production a failed one stops the boot.
    await createIndexes(strapi);
    await seedPermissions(strapi);
    await backfillUserRoles(strapi);
    await backfillSchoolCoordinates(strapi);
    // Development only: never set SEED_SAMPLE_DATA on Strapi Cloud.
    if (process.env.SEED_SAMPLE_DATA === 'true') {
      try {
        await seedSampleData(strapi);
      } catch (e) {
        strapi.log.error('[matfinder] sample data seed failed', e);
      }
    }
  },
};
