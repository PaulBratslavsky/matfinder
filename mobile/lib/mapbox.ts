/** Public Mapbox token (URL-restricted in production). Without one, Explore shows the school list without the map. */
export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
export const hasMapboxToken = MAPBOX_TOKEN.startsWith('pk.');
