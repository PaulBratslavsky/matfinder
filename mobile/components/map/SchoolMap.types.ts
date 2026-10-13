import type { DirectorySchool } from '@/lib/api/schools';
import type { Coordinates } from '@/lib/geo';

/** Shared by SchoolMap.tsx (native, @rnmapbox/maps) and SchoolMap.web.tsx (react-map-gl). */
export type SchoolMapProps = {
  schools: DirectorySchool[];
  center: Coordinates;
  zoom: number;
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
  userLocation: Coordinates | null;
  /** Bumped by the recenter button: the map flies back to `center`. */
  recenterKey: number;
};

/** Public Mapbox token (URL-restricted in production). Without one the app shows MapUnavailable and the list. */
export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
export const hasMapboxToken = MAPBOX_TOKEN.startsWith('pk.');

export const PIN_COLOR = '#1961cc'; // --primary
export const SELECTED_COLOR = '#f59e0b';

/** Pins as GeoJSON, with the selected school flagged so the layers can highlight it. */
export function toFeatureCollection(schools: DirectorySchool[], selectedSlug: string | null): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: schools.map((s) => ({
      type: 'Feature',
      id: s.slug,
      geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
      properties: { slug: s.slug, name: s.name, selected: s.slug === selectedSlug },
    })),
  };
}

export const CLUSTER = { radius: 45, maxZoom: 13 };
