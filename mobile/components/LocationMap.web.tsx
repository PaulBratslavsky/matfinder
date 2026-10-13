/**
 * Web counterpart of LocationMap.tsx (metravel-explore's @rnmapbox/maps map), with the same props and ref API.
 * Built on react-map-gl + mapbox-gl, since @rnmapbox/maps' web support is limited. `searchable` (place search)
 * isn't implemented here; MatFinder searches schools in its own sheet.
 * MatFinder: themed (map style, pins, control card from theme/tokens.ts) and driven by a declarative `camera`.
 */
import 'mapbox-gl/dist/mapbox-gl.css';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Map, { GeolocateControl, Layer, Marker, Source, type MapRef } from 'react-map-gl/mapbox';
import { MapPin, pinGeometry } from '@/components/map/MapPin';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import type { CameraPadding, LocationMapProps, LocationMapRef, MapCamera, MapLocation, MapMarker } from './LocationMap';

export type { CameraPadding, LocationMapProps, LocationMapRef, MapCamera, MapLocation, MapMarker };

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
const NO_PADDING: CameraPadding = { top: 0, right: 0, bottom: 0, left: 0 };
/** Fitting never zooms in further than this (one school, or a few close together). */
const FIT_MAX_ZOOM = 14;

/** Same approximation as the native map: zoom 10 ≈ 10 miles, each level halves the distance. */
function getZoomForRadius(radiusMiles: number): number {
  return 10 + Math.log2(10 / radiusMiles);
}

function circleGeoJSON(center: [number, number], radiusMiles: number, points = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const radiusKm = radiusMiles * 1.60934;
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const lat = center[1] + (radiusKm * Math.sin(angle)) / 111.32;
    const lng = center[0] + (radiusKm * Math.cos(angle)) / (111.32 * Math.cos((center[1] * Math.PI) / 180));
    coords.push([lng, lat]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}

export function LocationMap({
  location,
  style,
  showMarker = true,
  onMarkerPress,
  radiusMiles,
  showControls = false,
  showUserLocation = false,
  markers = [],
  onMarkerSelect,
  selectedMarkerId = null,
  camera,
  cameraPadding = NO_PADDING,
  controlsTop = 76,
  interactive = true,
  mapRef,
}: LocationMapProps & { mapRef?: React.RefObject<LocationMapRef | null> }) {
  const styles = useStyles();
  const theme = useTheme();
  const map = useRef<MapRef>(null);
  const geolocate = useRef<any>(null);
  const zoom = radiusMiles ? getZoomForRadius(radiusMiles) : location.zoom;

  useImperativeHandle(
    mapRef,
    () => ({ flyTo: ({ longitude, latitude, zoom: z }) => map.current?.flyTo({ center: [longitude, latitude], zoom: z ?? 14, duration: 1000 }) }),
    [],
  );

  // The camera follows `camera` whenever its key changes (the first one is the initial view below).
  const appliedCamera = useRef(camera?.key);
  useEffect(() => {
    if (!camera || camera.key === appliedCamera.current) return;
    appliedCamera.current = camera.key;
    if ('bounds' in camera) map.current?.fitBounds(camera.bounds, { padding: cameraPadding, maxZoom: FIT_MAX_ZOOM, duration: 800 });
    else map.current?.flyTo({ center: [camera.center.longitude, camera.center.latitude], zoom: camera.zoom, padding: cameraPadding, duration: 800 });
  }, [camera, cameraPadding]);

  // Only the first render's view matters; later changes go through `camera`.
  const [initialViewState] = useState(() => {
    if (camera && 'bounds' in camera) return { bounds: camera.bounds, fitBoundsOptions: { padding: cameraPadding, maxZoom: FIT_MAX_ZOOM } };
    const c = camera && 'center' in camera ? { ...camera.center, zoom: camera.zoom } : { longitude: location.longitude, latitude: location.latitude, zoom };
    return { ...c, pitch: location.pitch, bearing: location.bearing, padding: cameraPadding };
  });

  const handleRecenter = useCallback(() => {
    map.current?.flyTo({ center: [location.longitude, location.latitude], zoom, padding: cameraPadding, duration: 500 });
  }, [location.longitude, location.latitude, zoom, cameraPadding]);

  const circle = useMemo(
    () => (radiusMiles ? circleGeoJSON([location.longitude, location.latitude], radiusMiles) : null),
    [radiusMiles, location.longitude, location.latitude],
  );

  return (
    <View style={[styles.container, style]}>
      <Map
        ref={map}
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={theme.mapStyle}
        interactive={interactive}
        onLoad={() => showUserLocation && geolocate.current?.trigger()}>
        {circle && (
          <Source id="radius-circle" type="geojson" data={circle}>
            <Layer id="radius-fill" type="fill" paint={{ 'fill-color': theme.colors.redTint, 'fill-outline-color': theme.colors.red }} />
            <Layer id="radius-line" type="line" paint={{ 'line-color': theme.colors.red, 'line-width': 2, 'line-dasharray': [2, 2] }} />
          </Source>
        )}
        {showMarker && (
          <Marker longitude={location.longitude} latitude={location.latitude} anchor="top" offset={[0, -pinGeometry('today', true).centerY]} onClick={onMarkerPress}>
            <MapPin tone="today" selected />
          </Marker>
        )}
        {markers.map((marker) => {
          const isSelected = marker.id === selectedMarkerId;
          const tone = marker.tone ?? 'today';
          return (
            <Marker
              key={marker.id}
              longitude={marker.longitude}
              latitude={marker.latitude}
              // Anchor the pin's center (not the tag above it) on the school.
              anchor="top"
              offset={[0, -pinGeometry(tone, isSelected, marker.tag).centerY]}
              // The marker box is wider than the pin (room for the tag); only the pin and tag take clicks.
              style={{ zIndex: isSelected ? 3 : tone === 'muted' ? 1 : 2, cursor: 'pointer', pointerEvents: 'none' }}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onMarkerSelect?.(marker);
              }}>
              <View accessibilityLabel={`${marker.name} pin`}>
                <MapPin tone={tone} tag={marker.tag} selected={isSelected} dimmed={!!selectedMarkerId && !isSelected} />
              </View>
            </Marker>
          );
        })}
        {/* Shows the user's position like the native LocationPuck; its own button is hidden (our card recenters). */}
        {showUserLocation && <GeolocateControl ref={geolocate} showUserLocation trackUserLocation={false} style={{ display: 'none' }} />}
      </Map>

      {showControls && (
        <View style={[styles.controls, { top: controlsTop }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" style={styles.control} onPress={() => map.current?.zoomIn({ duration: 300 })}>
            <Ionicons name="add" size={22} color={theme.colors.text} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" style={styles.control} onPress={() => map.current?.zoomOut({ duration: 300 })}>
            <Ionicons name="remove" size={22} color={theme.colors.text} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable accessibilityRole="button" accessibilityLabel="Recenter map" style={styles.control} onPress={handleRecenter}>
            <Ionicons name="navigate-outline" size={19} color={theme.colors.text} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.bg },
  controls: {
    position: 'absolute',
    right: 12,
    width: 44,
    borderRadius: t.radii.field,
    backgroundColor: t.colors.overlay,
    boxShadow: `0 4px 16px ${t.colors.shadow}`,
    overflow: 'hidden',
  },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: t.colors.separator, marginHorizontal: 8 },
}));
