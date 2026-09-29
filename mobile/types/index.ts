

export type TStrapiResponseSingle<T> = {
  data: T
  meta?: {
    pagination?: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export type TStrapiResponseCollection<T> = {
  data: T[]
  meta?: {
    pagination?: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export type TStrapiResponse<T = null> = {
  data?: T
  error?: {
    status: number
    name: string
    message: string
    details?: Record<string, string[]>
  }
  meta?: {
    pagination?: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
  success?: boolean
  status?: number
}

// Location type matching Strapi MapBox plugin field
export type MapLocation = {
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
  address?: string
}

export type Location = {
  id: number
  documentId: string
  name?: string
  description?: string
  mapData: MapLocation
  createdAt: string
  updatedAt: string
  publishedAt: string
}

