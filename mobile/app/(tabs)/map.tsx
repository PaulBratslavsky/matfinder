import { useCallback, useMemo, useRef, useState } from 'react'
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { LocationMap, type LocationMapRef, type MapMarker } from '@/components/LocationMap'
import { useLocations } from '@/hooks/useLocations'
import type { Location } from '@/types'

// Default map view (US center) when no locations
const DEFAULT_VIEW = {
  longitude: -98.5795,
  latitude: 39.8283,
  zoom: 3,
  pitch: 0,
  bearing: 0,
}

export default function MapScreen() {
  const mapRef = useRef<LocationMapRef>(null)
  const { data, isLoading, error, refetch } = useLocations(1, 100) // Fetch up to 100 locations
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

  const locations = data?.data ?? []

  const mapMarkers: MapMarker[] = useMemo(() => {
    return locations.map((loc) => ({
      id: loc.documentId,
      longitude: loc.mapData.longitude,
      latitude: loc.mapData.latitude,
      name: loc.name ? String(loc.name) : 'Unnamed Location',
      address: loc.mapData.address,
    }))
  }, [locations])

  // Calculate center point from all locations
  const mapCenter = useMemo(() => {
    if (locations.length === 0) return DEFAULT_VIEW

    if (locations.length === 1) {
      return locations[0].mapData
    }

    // Calculate bounding box center
    const lngs = locations.map((l) => l.mapData.longitude)
    const lats = locations.map((l) => l.mapData.latitude)
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2

    // Calculate zoom based on spread
    const lngSpread = Math.max(...lngs) - Math.min(...lngs)
    const latSpread = Math.max(...lats) - Math.min(...lats)
    const maxSpread = Math.max(lngSpread, latSpread)
    const zoom = maxSpread > 10 ? 4 : maxSpread > 5 ? 6 : maxSpread > 1 ? 8 : 10

    return {
      longitude: centerLng,
      latitude: centerLat,
      zoom,
      pitch: 0,
      bearing: 0,
    }
  }, [locations])

  const handleMarkerSelect = useCallback((marker: MapMarker) => {
    const location = locations.find((loc) => loc.documentId === marker.id)
    if (location) {
      setSelectedLocation(location)
      mapRef.current?.flyTo({
        longitude: location.mapData.longitude,
        latitude: location.mapData.latitude,
        zoom: location.mapData.zoom,
      })
    }
  }, [locations])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    setSelectedLocation(null)
    await refetch()
    setIsRefreshing(false)
  }, [refetch])

  // Refetch when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4945ff" />
        <Text style={styles.loadingText}>Loading locations...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error loading locations</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <LocationMap
          mapRef={mapRef}
          location={mapCenter}
          showMarker={false}
          searchable
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          markers={mapMarkers}
          onMarkerSelect={handleMarkerSelect}
          showControls
        />

        {/* Location count badge */}
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{locations.length} location{locations.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Selected Location Info Overlay */}
        {selectedLocation && (
          <View style={styles.infoOverlay}>
            <Text style={styles.title} numberOfLines={1}>
              {selectedLocation.name ? String(selectedLocation.name) : 'Unnamed Location'}
            </Text>
            {selectedLocation.mapData.address && (
              <Text style={styles.address} numberOfLines={1}>{selectedLocation.mapData.address}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapContainer: {
    flex: 1,
  },
  countBadge: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e53e3e',
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
})
