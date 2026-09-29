/**
 * Geographic utilities for distance calculations and bounding boxes
 */

const EARTH_RADIUS_MILES = 3958.8;
const MILES_PER_DEGREE_LAT = 69;

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

/**
 * Calculate the Haversine distance between two points in miles
 */
export function getDistanceMiles(from: Coordinates, to: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

/**
 * Calculate a bounding box around a point for a given radius in miles
 * Used for pre-filtering before applying Haversine for accuracy
 */
export function getBoundingBox(center: Coordinates, radiusMiles: number): BoundingBox {
  const latOffset = radiusMiles / MILES_PER_DEGREE_LAT;
  // Longitude degrees vary by latitude
  const lngOffset = radiusMiles / (MILES_PER_DEGREE_LAT * Math.cos((center.latitude * Math.PI) / 180));

  return {
    minLat: center.latitude - latOffset,
    maxLat: center.latitude + latOffset,
    minLng: center.longitude - lngOffset,
    maxLng: center.longitude + lngOffset,
  };
}

/**
 * Convert bounding box to Strapi filter format
 */
export function bboxToStrapiFilters(bbox: BoundingBox) {
  return {
    mapData: {
      latitude: {
        $gte: bbox.minLat,
        $lte: bbox.maxLat,
      },
      longitude: {
        $gte: bbox.minLng,
        $lte: bbox.maxLng,
      },
    },
  };
}
