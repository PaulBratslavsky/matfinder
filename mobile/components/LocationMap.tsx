import Mapbox, { Camera, MapView, PointAnnotation, ShapeSource, FillLayer, LineLayer, LocationPuck, Callout } from '@rnmapbox/maps';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

// Set your Mapbox access token
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export type MapLocation = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  address?: string;
};

const DEFAULT_LOCATION: MapLocation = {
  longitude: -122.4194,
  latitude: 37.7749,
  zoom: 12,
  pitch: 0,
  bearing: 0,
};

const sanitizeLocation = (location: Partial<MapLocation>): MapLocation => ({
  longitude: Number.isFinite(location?.longitude) ? location.longitude! : DEFAULT_LOCATION.longitude,
  latitude: Number.isFinite(location?.latitude) ? location.latitude! : DEFAULT_LOCATION.latitude,
  zoom: Number.isFinite(location?.zoom) ? location.zoom! : DEFAULT_LOCATION.zoom,
  pitch: Number.isFinite(location?.pitch) ? location.pitch! : DEFAULT_LOCATION.pitch,
  bearing: Number.isFinite(location?.bearing) ? location.bearing! : DEFAULT_LOCATION.bearing,
  address: location?.address,
});

/**
 * Generate a GeoJSON circle polygon for radius overlay
 */
function createCircleGeoJSON(
  center: [number, number],
  radiusMiles: number,
  points = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const radiusKm = radiusMiles * 1.60934;
  const coords: [number, number][] = [];

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle);
    const dy = radiusKm * Math.sin(angle);

    // Convert km offset to degrees
    const lat = center[1] + (dy / 111.32);
    const lng = center[0] + (dx / (111.32 * Math.cos(center[1] * (Math.PI / 180))));
    coords.push([lng, lat]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
}

type SearchResult = {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
};

export type MapMarker = {
  id: string;
  longitude: number;
  latitude: number;
  name: string;
  address?: string;
};

type LocationMapProps = {
  location: MapLocation;
  style?: object;
  showMarker?: boolean;
  onMarkerPress?: () => void;
  searchable?: boolean;
  onLocationChange?: (location: MapLocation) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  radiusMiles?: number;
  showControls?: boolean;
  showUserLocation?: boolean;
  markers?: MapMarker[];
  onMarkerSelect?: (marker: MapMarker) => void;
};

/**
 * Calculate appropriate zoom level to fit a radius in miles
 * Returns zoom level that shows the full circle with some padding
 */
function getZoomForRadius(radiusMiles: number): number {
  // Approximate: zoom 10 ~ 10 miles, each zoom level halves the distance
  // For 5 miles, zoom ~11 works well
  const baseZoom = 10;
  const baseMiles = 10;
  return baseZoom + Math.log2(baseMiles / radiusMiles);
}

export type LocationMapRef = {
  flyTo: (coords: { longitude: number; latitude: number; zoom?: number }) => void;
};

export function LocationMap({
  location,
  style,
  showMarker = true,
  onMarkerPress,
  searchable = false,
  onLocationChange,
  onRefresh,
  isRefreshing = false,
  radiusMiles,
  showControls = false,
  showUserLocation = false,
  markers = [],
  onMarkerSelect,
  mapRef,
}: LocationMapProps & { mapRef?: React.RefObject<LocationMapRef | null> }) {
  const cameraRef = useRef<Camera>(null);
  const [currentZoom, setCurrentZoom] = useState(location.zoom);

  // Expose flyTo method via ref
  useEffect(() => {
    if (mapRef && 'current' in mapRef) {
      (mapRef as React.MutableRefObject<LocationMapRef | null>).current = {
        flyTo: ({ longitude, latitude, zoom }) => {
          cameraRef.current?.setCamera({
            centerCoordinate: [longitude, latitude],
            zoomLevel: zoom ?? 14,
            animationDuration: 1000,
          });
          if (zoom) setCurrentZoom(zoom);
        },
      };
    }
  }, [mapRef]);

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(currentZoom + 1, 20);
    setCurrentZoom(newZoom);
    cameraRef.current?.setCamera({
      zoomLevel: newZoom,
      animationDuration: 300,
    });
  }, [currentZoom]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(currentZoom - 1, 1);
    setCurrentZoom(newZoom);
    cameraRef.current?.setCamera({
      zoomLevel: newZoom,
      animationDuration: 300,
    });
  }, [currentZoom]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(() => sanitizeLocation(location));

  const handleRecenter = useCallback(() => {
    const zoom = radiusMiles ? getZoomForRadius(radiusMiles) : currentLocation.zoom;
    cameraRef.current?.setCamera({
      centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
      zoomLevel: zoom,
      animationDuration: 500,
    });
    setCurrentZoom(zoom);
  }, [currentLocation, radiusMiles]);

  // Calculate zoom to fit radius if provided
  const effectiveZoom = radiusMiles ? getZoomForRadius(radiusMiles) : currentLocation.zoom;

  // Generate circle GeoJSON for radius overlay
  const circleGeoJSON = radiusMiles
    ? createCircleGeoJSON([currentLocation.longitude, currentLocation.latitude], radiusMiles)
    : null;

  // Sync with prop changes
  useEffect(() => {
    setCurrentLocation(sanitizeLocation(location));
  }, [location]);

  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim() || !MAPBOX_ACCESS_TOKEN) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const encodedQuery = encodeURIComponent(query.trim());
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5`
      );
      const data = await response.json();

      if (data.features) {
        setSearchResults(
          data.features.map((feature: any) => ({
            id: feature.id,
            place_name: feature.place_name,
            center: feature.center,
            place_type: feature.place_type,
          }))
        );
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (text.length > 2) {
        searchLocation(text);
      } else {
        setSearchResults([]);
      }
    },
    [searchLocation]
  );

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      const [longitude, latitude] = result.center;
      const newLocation: MapLocation = {
        longitude,
        latitude,
        zoom: 14,
        pitch: currentLocation.pitch,
        bearing: currentLocation.bearing,
        address: result.place_name,
      };

      setCurrentLocation(newLocation);
      setSearchQuery(result.place_name);
      setSearchResults([]);
      setIsSearchFocused(false);
      Keyboard.dismiss();

      // Animate camera to new location
      cameraRef.current?.setCamera({
        centerCoordinate: [longitude, latitude],
        zoomLevel: 14,
        animationDuration: 1000,
      });

      onLocationChange?.(newLocation);
    },
    [currentLocation.pitch, currentLocation.bearing, onLocationChange]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const getPlaceIcon = (placeType: string[]): keyof typeof Ionicons.glyphMap => {
    if (placeType.includes('poi')) return 'location';
    if (placeType.includes('address')) return 'home';
    if (placeType.includes('place') || placeType.includes('locality')) return 'business';
    if (placeType.includes('region') || placeType.includes('country')) return 'globe';
    return 'location-outline';
  };

  return (
    <View style={[styles.container, style]}>
      <MapView style={styles.map}>
        <Camera
          ref={cameraRef}
          centerCoordinate={[currentLocation.longitude, currentLocation.latitude]}
          zoomLevel={effectiveZoom}
          pitch={currentLocation.pitch}
          heading={currentLocation.bearing}
        />
        {circleGeoJSON && (
          <ShapeSource id="radius-circle" shape={circleGeoJSON}>
            <FillLayer
              id="radius-fill"
              style={{
                fillColor: 'rgba(0, 122, 255, 0.1)',
                fillOutlineColor: 'rgba(0, 122, 255, 0.5)',
              }}
            />
            <LineLayer
              id="radius-line"
              style={{
                lineColor: 'rgba(0, 122, 255, 0.6)',
                lineWidth: 2,
                lineDasharray: [2, 2],
              }}
            />
          </ShapeSource>
        )}
        {showMarker && (
          <PointAnnotation
            id="location-marker"
            coordinate={[currentLocation.longitude, currentLocation.latitude]}
            onSelected={onMarkerPress}
          >
            <View style={styles.marker} />
          </PointAnnotation>
        )}
        {markers.map((marker) => (
          <PointAnnotation
            key={marker.id}
            id={`marker-${marker.id}`}
            coordinate={[marker.longitude, marker.latitude]}
            onSelected={() => onMarkerSelect?.(marker)}
          >
            <View style={styles.savedMarker}>
              <Ionicons name="location" size={12} color="#FFFFFF" />
            </View>
            <Callout title={marker.name}>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{marker.name}</Text>
                {marker.address && (
                  <Text style={styles.calloutAddress} numberOfLines={2}>
                    {marker.address}
                  </Text>
                )}
              </View>
            </Callout>
          </PointAnnotation>
        ))}
        {showUserLocation && <LocationPuck puckBearing="heading" puckBearingEnabled />}
      </MapView>

      {showControls && (
        <View style={styles.controlsContainer}>
          <Pressable
            style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
            onPress={handleZoomIn}
          >
            <Ionicons name="add" size={24} color="#000" />
          </Pressable>
          <View style={styles.controlDivider} />
          <Pressable
            style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
            onPress={handleZoomOut}
          >
            <Ionicons name="remove" size={24} color="#000" />
          </Pressable>
          <View style={styles.controlSpacer} />
          <Pressable
            style={({ pressed }) => [styles.controlButton, styles.recenterButton, pressed && styles.controlButtonPressed]}
            onPress={handleRecenter}
          >
            <Ionicons name="locate" size={22} color="#007AFF" />
          </Pressable>
        </View>
      )}

      {searchable && (
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <BlurView
                intensity={80}
                tint={Platform.OS === 'ios' ? 'systemChromeMaterial' : 'light'}
                style={styles.searchBarBlur}
              >
                <View style={styles.searchBar}>
                  <Ionicons
                    name="search"
                    size={18}
                    color="#8E8E93"
                    style={styles.searchIcon}
                  />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    placeholder="Search location"
                    placeholderTextColor="#8E8E93"
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => {
                      // Delay to allow result selection
                      setTimeout(() => setIsSearchFocused(false), 200);
                    }}
                    returnKeyType="search"
                    clearButtonMode="never"
                    autoCorrect={false}
                  />
                  {isSearching && (
                    <ActivityIndicator
                      size="small"
                      color="#007AFF"
                      style={styles.searchSpinner}
                    />
                  )}
                  {searchQuery.length > 0 && !isSearching && (
                    <Pressable
                      onPress={handleClearSearch}
                      hitSlop={8}
                      style={styles.clearButton}
                    >
                      <View style={styles.clearButtonInner}>
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </View>
                    </Pressable>
                  )}
                </View>
              </BlurView>
            </View>

            {onRefresh && (
              <Pressable
                onPress={onRefresh}
                disabled={isRefreshing}
                style={({ pressed }) => [
                  styles.refreshButton,
                  pressed && styles.refreshButtonPressed,
                  isRefreshing && styles.refreshButtonRefreshing,
                ]}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="refresh" size={20} color="#fff" />
                )}
              </Pressable>
            )}
          </View>

          {isSearchFocused && searchResults.length > 0 && (
            <BlurView
              intensity={90}
              tint={Platform.OS === 'ios' ? 'systemChromeMaterial' : 'light'}
              style={styles.resultsContainer}
            >
              {searchResults.map((result, index) => (
                <Pressable
                  key={result.id}
                  style={({ pressed }) => [
                    styles.resultItem,
                    pressed && styles.resultItemPressed,
                    index < searchResults.length - 1 && styles.resultItemBorder,
                  ]}
                  onPress={() => handleSelectResult(result)}
                >
                  <View style={styles.resultIconContainer}>
                    <Ionicons
                      name={getPlaceIcon(result.place_type)}
                      size={20}
                      color="#007AFF"
                    />
                  </View>
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultText} numberOfLines={1}>
                      {result.place_name.split(',')[0]}
                    </Text>
                    <Text style={styles.resultSubtext} numberOfLines={1}>
                      {result.place_name.split(',').slice(1).join(',').trim()}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </BlurView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
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
    elevation: 4,
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
    elevation: 3,
  },
  calloutContainer: {
    padding: 8,
    minWidth: 120,
    maxWidth: 200,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  calloutAddress: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchBarBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#4945ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  refreshButtonPressed: {
    backgroundColor: '#3832e0',
    transform: [{ scale: 0.95 }],
  },
  refreshButtonRefreshing: {
    backgroundColor: '#6c63ff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
    paddingVertical: 0,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
  },
  clearButtonInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8E8E93',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  resultItemPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  resultItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
  },
  resultIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#000000',
    marginBottom: 2,
  },
  resultSubtext: {
    fontSize: 13,
    color: '#8E8E93',
  },
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
    elevation: 4,
  },
  controlButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  controlDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(60, 60, 67, 0.2)',
    marginHorizontal: 8,
  },
  controlSpacer: {
    height: 8,
  },
  recenterButton: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(60, 60, 67, 0.2)',
  },
});
