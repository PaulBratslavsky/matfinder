import { strapi } from '@/lib/api'
import type { BoundingBox } from '@/lib/geo'
import type { Location, TStrapiResponse } from '@/types'

const PAGE_SIZE = 10

// Locations (Collection Type)
const locations = strapi.collection('locations')

export interface GetLocationsParams {
  page?: number
  pageSize?: number
}

export interface GetNearbyLocationsParams {
  bbox: BoundingBox
  pageSize?: number
}

export async function getLocations(
  params?: GetLocationsParams
): Promise<TStrapiResponse<Location[]>> {
  const { page = 1, pageSize = PAGE_SIZE } = params || {}

  const response = await locations.find<Location>({
    sort: ['createdAt:desc'],
    pagination: {
      page,
      pageSize,
    },
    populate: '*',
  })

  return response
}

export async function getLocationById(
  documentId: string
): Promise<TStrapiResponse<Location>> {
  const response = await locations.findOne<Location>(documentId, {
    populate: '*',
  })

  return response
}

export async function getNearbyLocations(
  params: GetNearbyLocationsParams
): Promise<TStrapiResponse<Location[]>> {
  const { pageSize = 50 } = params

  // Fetch all locations, filter by distance client-side
  // (Strapi JSON field filtering on custom fields is unreliable)
  const response = await locations.find<Location>({
    pagination: {
      pageSize,
    },
    populate: '*',
  })

  return response
}
