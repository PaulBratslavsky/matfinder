/**
 * Geographic utilities: straight-line distance and directions links
 */
import { Platform } from 'react-native';

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

/** "2.4 mi" (one decimal under 10 miles). */
export function formatMiles(miles: number): string {
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
}

/** Turn-by-turn directions: Apple Maps on iOS, Google Maps everywhere else. */
export function directionsUrl(latitude: number, longitude: number, name: string): string {
  const destination = `${latitude},${longitude}`;
  if (Platform.OS === 'ios') return `https://maps.apple.com/?daddr=${destination}&q=${encodeURIComponent(name)}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}
