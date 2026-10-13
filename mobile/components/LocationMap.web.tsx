/**
 * Web counterpart of LocationMap.tsx (metravel-explore's @rnmapbox/maps map), with the same props, ref API and
 * look: red location pins, the selected pin larger and blue, a callout for the selected marker, the zoom/recenter
 * control card and an optional radius circle. Built on react-map-gl + mapbox-gl, since @rnmapbox/maps' web support
 * is limited. `searchable` (place search) isn't implemented here; MatFinder searches schools in its own sheet.
 */
import 'mapbox-gl/dist/mapbox-gl.css';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Map, { GeolocateControl, Layer, Marker, Popup, Source, type MapRef } from 'react-map-gl/mapbox';
import type { LocationMapProps, LocationMapRef, MapLocation, MapMarker } from './LocationMap';

export type { LocationMapProps, LocationMapRef, MapLocation, MapMarker };

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

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
  mapRef,
}: LocationMapProps & { mapRef?: React.RefObject<LocationMapRef | null> }) {
  const map = useRef<MapRef>(null);
  const geolocate = useRef<any>(null);
  const zoom = radiusMiles ? getZoomForRadius(radiusMiles) : location.zoom;

  useImperativeHandle(
    mapRef,
    () => ({ flyTo: ({ longitude, latitude, zoom: z }) => map.current?.flyTo({ center: [longitude, latitude], zoom: z ?? 14, duration: 1000 }) }),
    [],
  );

  const handleRecenter = useCallback(() => {
    map.current?.flyTo({ center: [location.longitude, location.latitude], zoom, duration: 500 });
  }, [location.longitude, location.latitude, zoom]);

  const circle = useMemo(
    () => (radiusMiles ? circleGeoJSON([location.longitude, location.latitude], radiusMiles) : null),
    [radiusMiles, location.longitude, location.latitude],
  );
  const selected = markers.find((m) => m.id === selectedMarkerId) ?? null;

  return (
    <View style={[styles.container, style]}>
      <Map
        ref={map}
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        initialViewState={{ longitude: location.longitude, latitude: location.latitude, zoom, pitch: location.pitch, bearing: location.bearing }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onLoad={() => showUserLocation && geolocate.current?.trigger()}>
        {circle && (
          <Source id="radius-circle" type="geojson" data={circle}>
            <Layer id="radius-fill" type="fill" paint={{ 'fill-color': 'rgba(0, 122, 255, 0.1)', 'fill-outline-color': 'rgba(0, 122, 255, 0.5)' }} />
            <Layer id="radius-line" type="line" paint={{ 'line-color': 'rgba(0, 122, 255, 0.6)', 'line-width': 2, 'line-dasharray': [2, 2] }} />
          </Source>
        )}
        {showMarker && (
          <Marker longitude={location.longitude} latitude={location.latitude} onClick={onMarkerPress}>
            <View style={styles.marker} />
          </Marker>
        )}
        {markers.map((marker) => {
          const isSelected = marker.id === selectedMarkerId;
          return (
            <Marker
              key={marker.id}
              longitude={marker.longitude}
              latitude={marker.latitude}
              style={{ zIndex: isSelected ? 2 : 1 }}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onMarkerSelect?.(marker);
              }}>
              <View accessibilityLabel={`${marker.name} pin`} style={[styles.savedMarker, isSelected && styles.savedMarkerSelected]}>
                <Ionicons name="location" size={isSelected ? 16 : 12} color="#FFFFFF" />
              </View>
            </Marker>
          );
        })}
        {selected && (
          <Popup longitude={selected.longitude} latitude={selected.latitude} offset={20} closeButton={false} closeOnClick={false} anchor="bottom">
            <View style={styles.calloutContainer}>
              <Text style={styles.calloutTitle}>{selected.name}</Text>
              {!!selected.address && (
                <Text style={styles.calloutAddress} numberOfLines={2}>
                  {selected.address}
                </Text>
              )}
            </View>
          </Popup>
        )}
        {/* Shows the user's position like the native LocationPuck; its own button is hidden (our card recenters). */}
        {showUserLocation && <GeolocateControl ref={geolocate} showUserLocation trackUserLocation={false} style={{ display: 'none' }} />}
      </Map>

      {showControls && (
        <View style={styles.controlsContainer}>
          <Pressable
            accessibilityLabel="Zoom in"
            style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
            onPress={() => map.current?.zoomIn({ duration: 300 })}>
            <Ionicons name="add" size={24} color="#000" />
          </Pressable>
          <View style={styles.controlDivider} />
          <Pressable
            accessibilityLabel="Zoom out"
            style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
            onPress={() => map.current?.zoomOut({ duration: 300 })}>
            <Ionicons name="remove" size={24} color="#000" />
          </Pressable>
          <View style={styles.controlSpacer} />
          <Pressable
            accessibilityLabel="Recenter map"
            style={({ pressed }) => [styles.controlButton, styles.recenterButton, pressed && styles.controlButtonPressed]}
            onPress={handleRecenter}>
            <Ionicons name="locate" size={22} color="#007AFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

// The native map's styles (metravel-explore), reused for the same look.
const styles = StyleSheet.create({
  container: { flex: 1 },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  savedMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    cursor: 'pointer',
  } as any,
  savedMarkerSelected: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#007AFF', borderWidth: 3 },
  calloutContainer: { padding: 4, minWidth: 120, maxWidth: 200 },
  calloutTitle: { fontSize: 14, fontWeight: '600', color: '#000000' },
  calloutAddress: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  controlsContainer: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 120 : 76,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  controlButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  controlButtonPressed: { backgroundColor: 'rgba(0, 0, 0, 0.05)' },
  controlDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(60, 60, 67, 0.2)', marginHorizontal: 8 },
  controlSpacer: { height: 8 },
  recenterButton: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(60, 60, 67, 0.2)' },
});
