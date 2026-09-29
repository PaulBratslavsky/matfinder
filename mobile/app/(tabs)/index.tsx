import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LocationMap, MapLocation, type LocationMapRef, type MapMarker } from '@/components/LocationMap';
import { useNearbyLocations, type NearbyLocation } from '@/hooks/useLocations';

const RADIUS_MILES = 2.5;

type LocationState = {
  status: 'loading' | 'granted' | 'denied' | 'error';
  location: MapLocation | null;
  errorMessage?: string;
};

function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return `${Math.round(miles * 5280)} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

function LocationCard({
  location,
  onPress,
}: {
  location: NearbyLocation;
  onPress: () => void;
}) {
  const displayName = location.name ? String(location.name) : 'Unnamed Location';

  return (
    <Pressable
      style={({ pressed }) => [styles.locationCard, pressed && styles.locationCardPressed]}
      onPress={onPress}
    >
      <View style={styles.locationCardIcon}>
        <Ionicons name="location" size={20} color="#007AFF" />
      </View>
      <View style={styles.locationCardContent}>
        <Text style={styles.locationCardName} numberOfLines={1}>
          {displayName}
        </Text>
        {location.mapData.address && (
          <Text style={styles.locationCardAddress} numberOfLines={1}>
            {location.mapData.address}
          </Text>
        )}
      </View>
      <View style={styles.locationCardDistance}>
        <Text style={styles.locationCardDistanceText}>
          {formatDistance(location.distance)}
        </Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const queryClient = useQueryClient();
  const mapRef = useRef<LocationMapRef>(null);
  const [state, setState] = useState<LocationState>({
    status: 'loading',
    location: null,
  });

  const userCoords = state.location
    ? { latitude: state.location.latitude, longitude: state.location.longitude }
    : null;

  const {
    locations: nearbyLocations,
    isLoading: isLoadingNearby,
  } = useNearbyLocations(userCoords, { radiusMiles: RADIUS_MILES });

  const [searchQuery, setSearchQuery] = useState('');

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return nearbyLocations;
    const query = searchQuery.toLowerCase();
    return nearbyLocations.filter(
      (loc) =>
        loc.name?.toLowerCase().includes(query) ||
        loc.mapData.address?.toLowerCase().includes(query)
    );
  }, [nearbyLocations, searchQuery]);

  const mapMarkers: MapMarker[] = useMemo(() => {
    return nearbyLocations.map((loc) => ({
      id: loc.documentId,
      longitude: loc.mapData.longitude,
      latitude: loc.mapData.latitude,
      name: loc.name || 'Unnamed Location',
      address: loc.mapData.address,
    }));
  }, [nearbyLocations]);

  const handleLocationSelect = useCallback((location: NearbyLocation) => {
    mapRef.current?.flyTo({
      longitude: location.mapData.longitude,
      latitude: location.mapData.latitude,
      zoom: location.mapData.zoom,
    });
  }, []);

  
  const requestLocation = useCallback(async () => {
    setState({ status: 'loading', location: null });

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setState({
          status: 'denied',
          location: null,
          errorMessage: 'Location permission is required to show nearby places',
        });
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setState({
        status: 'granted',
        location: {
          longitude: currentLocation.coords.longitude,
          latitude: currentLocation.coords.latitude,
          zoom: 14,
          pitch: 0,
          bearing: 0,
        },
      });
    } catch (error) {
      setState({
        status: 'error',
        location: null,
        errorMessage: 'Failed to get your location. Please try again.',
      });
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setSearchQuery('');
    // Invalidate cache to force fresh fetch
    await queryClient.invalidateQueries({ queryKey: ['nearby-locations'] });
    await requestLocation();
  }, [queryClient, requestLocation]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  if (state.status === 'loading') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (state.status === 'denied' || state.status === 'error') {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIcon}>
          <Ionicons
            name={state.status === 'denied' ? 'location-outline' : 'alert-circle-outline'}
            size={48}
            color="#8E8E93"
          />
        </View>
        <Text style={styles.errorTitle}>
          {state.status === 'denied' ? 'Location Access Needed' : 'Something Went Wrong'}
        </Text>
        <Text style={styles.errorMessage}>{state.errorMessage}</Text>
        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          onPress={requestLocation}
        >
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (!state.location) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LocationMap
        location={state.location}
        showMarker
        searchable={false}
        radiusMiles={RADIUS_MILES}
        mapRef={mapRef}
        showControls
        showUserLocation
        markers={mapMarkers}
        onMarkerSelect={(marker) => {
          const location = nearbyLocations.find((loc) => loc.documentId === marker.id);
          if (location) handleLocationSelect(location);
        }}
      />

      <View style={styles.bottomSheet}>
        <View style={styles.bottomSheetHeader}>
          <View style={styles.bottomSheetHandle} />
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.pulsingDot} />
              <Text style={styles.headerTitle}>Nearby Places</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.headerSubtitle}>
                Within {RADIUS_MILES} mi
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.refreshButton,
                  pressed && styles.refreshButtonPressed,
                ]}
                onPress={handleRefresh}
              >
                <Ionicons name="refresh" size={18} color="#007AFF" />
              </Pressable>
            </View>
          </View>
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={16} color="#8E8E93" style={styles.searchBarIcon} />
            <TextInput
              style={styles.searchBarInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search saved places..."
              placeholderTextColor="#8E8E93"
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
          </View>
        </View>

        {isLoadingNearby ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingNearbyText}>Finding nearby places...</Text>
          </View>
        ) : filteredLocations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={32} color="#8E8E93" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No matching places' : 'No saved places nearby'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'Try a different search term'
                : `Places you save within ${RADIUS_MILES} miles will appear here`}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.locationsList}
            contentContainerStyle={styles.locationsListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filteredLocations.map((location) => (
              <LocationCard
                key={location.documentId}
                location={location}
                onPress={() => handleLocationSelect(location)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 17,
    color: '#8E8E93',
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonPressed: {
    backgroundColor: '#0056B3',
    transform: [{ scale: 0.98 }],
  },
  retryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomSheetHeader: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
  },
  bottomSheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E5EA',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonPressed: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    marginTop: 12,
    paddingHorizontal: 10,
    height: 36,
  },
  searchBarIcon: {
    marginRight: 6,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
    paddingVertical: 0,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  loadingNearbyText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000000',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  locationsList: {
    flex: 1,
  },
  locationsListContent: {
    padding: 16,
    paddingBottom: 100,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  locationCardPressed: {
    backgroundColor: '#E5E5EA',
  },
  locationCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  locationCardName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  locationCardAddress: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  locationCardDistance: {
    marginLeft: 8,
  },
  locationCardDistanceText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
  },
});
