import { ToolError } from './errors';

/** The `map-box` custom field value. */
export type MapBoxValue = { longitude: number; latitude: number; address: string; zoom: number; pitch: number; bearing: number };

const GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

/**
 * Mapbox forward geocoding for `upsert_school`: US addresses and places, biased to the city center, best match only.
 * Uses the server-only MAPBOX_GEOCODING_TOKEN (falls back to MAPBOX_ACCESS_TOKEN). Every failure is GEOCODE_FAILED
 * with the address tried; the token never appears in errors or logs.
 */
export async function geocodeAddress(address: string, proximity?: { longitude: number; latitude: number } | null): Promise<MapBoxValue> {
  const fail = (message: string): never => {
    throw new ToolError('GEOCODE_FAILED', message, { address });
  };
  const token = process.env.MAPBOX_GEOCODING_TOKEN || process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) fail('Geocoding is not configured on the server (MAPBOX_GEOCODING_TOKEN); send latitude and longitude with the address');

  const params = new URLSearchParams({ access_token: token!, country: 'us', types: 'address,poi', limit: '1' });
  if (proximity && Number.isFinite(proximity.longitude) && Number.isFinite(proximity.latitude)) {
    params.set('proximity', `${proximity.longitude},${proximity.latitude}`);
  }
  let res: Response;
  try {
    res = await fetch(`${GEOCODING_URL}/${encodeURIComponent(address)}.json?${params}`, { signal: AbortSignal.timeout(5000) });
  } catch {
    return fail('Could not reach the geocoding service');
  }
  if (!res.ok) fail(`The geocoding service answered ${res.status}`);
  const body = (await res.json().catch(() => null)) as { features?: { center?: [number, number]; place_name?: string }[] } | null;
  const match = body?.features?.[0];
  if (!match?.center) fail('No match for this address');
  const [longitude, latitude] = match!.center!;
  return { longitude, latitude, address: match!.place_name ?? address, zoom: 15, pitch: 0, bearing: 0 };
}
