import type { Core } from '@strapi/strapi';
import { coordsOf } from './radius';

/**
 * Fills a school's `latitude` / `longitude` columns from its `location` where they're still empty: schools saved
 * before the columns existed (plan 08, M14). Runs at every boot and does nothing once every row is filled. It writes
 * through the query engine, which skips the Document Service middlewares, and covers draft and published rows alike.
 */
export async function backfillSchoolCoordinates(strapi: Core.Strapi) {
  try {
    const schools = strapi.db.query('api::school.school');
    const rows: { id: number; location: unknown }[] = await schools.findMany({ where: { latitude: { $null: true } }, select: ['id', 'location'] });
    let filled = 0;
    for (const row of rows) {
      const coords = coordsOf(row.location);
      if (!coords) continue;
      await schools.update({ where: { id: row.id }, data: coords });
      filled++;
    }
    if (filled) strapi.log.info(`[matfinder] filled latitude/longitude for ${filled} school rows`);
  } catch (e) {
    strapi.log.error('[matfinder] school coordinates backfill failed', e);
  }
}
