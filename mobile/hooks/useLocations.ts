import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getLocations, getLocationById, getNearbyLocations } from '@/data/loaders'
import { getBoundingBox, getDistanceMiles, type Coordinates } from '@/lib/geo'
import type { Location } from '@/types'

export function useLocations(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ['locations', page, pageSize],
    queryFn: () => getLocations({ page, pageSize }),
  })
}

export function useLocation(documentId: string) {
  return useQuery({
    queryKey: ['location', documentId],
    queryFn: () => getLocationById(documentId),
    enabled: !!documentId,
  })
}

export type NearbyLocation = Location & {
  distance: number
}

type UseNearbyLocationsOptions = {
  radiusMiles?: number
  enabled?: boolean
}

export function useNearbyLocations(
  userLocation: Coordinates | null,
  options: UseNearbyLocationsOptions = {}
) {
  const { radiusMiles = 5, enabled = true } = options

  const bbox = useMemo(() => {
    if (!userLocation) return null
    return getBoundingBox(userLocation, radiusMiles)
  }, [userLocation, radiusMiles])

  const query = useQuery({
    queryKey: ['nearby-locations', bbox, radiusMiles],
    queryFn: () => getNearbyLocations({ bbox: bbox! }),
    enabled: enabled && !!bbox,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Filter with Haversine and add distance, sorted by nearest
  const nearbyLocations = useMemo((): NearbyLocation[] => {
    if (!userLocation || !query.data?.data) return []

    return query.data.data
      .map((location) => ({
        ...location,
        distance: getDistanceMiles(userLocation, {
          latitude: location.mapData.latitude,
          longitude: location.mapData.longitude,
        }),
      }))
      .filter((loc) => loc.distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance)
  }, [query.data?.data, userLocation, radiusMiles])

  return {
    ...query,
    locations: nearbyLocations,
  }
}
