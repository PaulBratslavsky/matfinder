import { coordsOf } from '../lib/radius';
import { writeData, type DocumentMiddleware } from './utils';

/**
 * A school's `latitude` / `longitude` columns mirror its `location` map field, so the nearby query can filter by
 * distance in SQL (plan 08, M14). They're never set by hand: a write that sends `location` sets both (or clears them
 * for an invalid location), and a write without `location` can't touch them.
 */
export const schoolCoordinates: DocumentMiddleware = async (ctx, next) => {
  const data = writeData(ctx);
  if (data && ctx.uid === 'api::school.school') {
    if ('location' in data) {
      const coords = coordsOf(data.location);
      data.latitude = coords?.latitude ?? null;
      data.longitude = coords?.longitude ?? null;
    } else {
      delete data.latitude;
      delete data.longitude;
    }
  }
  return next();
};
