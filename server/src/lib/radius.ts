/**
 * Distance math for "gyms near a point" (plan 08, M14): pure, no Strapi. The nearby query narrows rows with a
 * bounding box on the indexed latitude/longitude columns, then keeps the ones whose great-circle distance is within
 * the radius. MatFinder is US-only, so boxes are not wrapped across the antimeridian.
 */

export type Coords = { latitude: number; longitude: number };
export type Box = { minLat: number; maxLat: number; minLng: number; maxLng: number };

export const DEFAULT_RADIUS_MILES = 25;
export const MIN_RADIUS_MILES = 1;
export const MAX_RADIUS_MILES = 100;

const EARTH_RADIUS_MILES = 3958.8;
const MILES_PER_DEGREE_LAT = 69.0;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in miles. */
export function haversineMiles(a: Coords, b: Coords): number {
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** A box that contains every point within `miles` of `center` (a little larger than the circle, never smaller). */
export function boundingBox(center: Coords, miles: number): Box {
  const dLat = miles / MILES_PER_DEGREE_LAT;
  const minLat = Math.max(-90, center.latitude - dLat);
  const maxLat = Math.min(90, center.latitude + dLat);
  const cos = Math.cos(rad(center.latitude));
  // Near the poles a degree of longitude shrinks to nothing; take every longitude rather than divide by ~0.
  if (cos < 0.01) return { minLat, maxLat, minLng: -180, maxLng: 180 };
  const dLng = miles / (MILES_PER_DEGREE_LAT * cos);
  return { minLat, maxLat, minLng: Math.max(-180, center.longitude - dLng), maxLng: Math.min(180, center.longitude + dLng) };
}

const toNumber = (v: unknown): number => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);

/** `lat` / `lng` from a query string, range-checked; null when either is missing or out of range. */
export function parseCoords(lat: unknown, lng: unknown): Coords | null {
  const latitude = toNumber(lat);
  const longitude = toNumber(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

/**
 * The radius in miles: 25 when missing, clamped to 1–100. Null for anything that isn't a positive number (the
 * endpoint answers 400).
 */
export function clampRadius(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return DEFAULT_RADIUS_MILES;
  const miles = toNumber(raw);
  if (!Number.isFinite(miles) || miles <= 0) return null;
  return Math.min(MAX_RADIUS_MILES, Math.max(MIN_RADIUS_MILES, miles));
}

/** The coordinates in a `map-box` field value (an object, or its JSON text); null without valid ones. */
export function coordsOf(location: unknown): Coords | null {
  let value = location;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  const { latitude, longitude } = value as { latitude?: unknown; longitude?: unknown };
  return parseCoords(latitude, longitude);
}

/** Miles to one decimal, for responses. */
export const roundMiles = (miles: number) => Math.round(miles * 10) / 10;
