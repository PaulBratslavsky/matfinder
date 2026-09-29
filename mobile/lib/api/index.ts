import * as qs from 'qs'
import type { TStrapiResponse } from '@/types'

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type ApiOptions<P = Record<string, unknown>> = {
  method: HTTPMethod
  payload?: P
  timeoutMs?: number
  authToken?: string
}

export type QueryOptions = {
  populate?: object | string | boolean
  filters?: object
  sort?: string | string[]
  pagination?: {
    page?: number
    pageSize?: number
    limit?: number
    start?: number
  }
  fields?: string[]
  publicationState?: 'live' | 'preview'
  locale?: string | string[]
}

const BASE_URL = process.env.EXPO_PUBLIC_STRAPI_URL || 'http://localhost:1337'

/**
 * Build URL with Strapi query parameters
 */
function buildUrl(endpoint: string, options?: QueryOptions): string {
  const url = new URL(`/api/${endpoint}`, BASE_URL)
  if (options) {
    url.search = qs.stringify(options, {
      encodeValuesOnly: true,
      encoder: (str, defaultEncoder, charset, type) => {
        const encoded = defaultEncoder(str, defaultEncoder, charset)
        // Strapi expects literal colons and asterisks (e.g., "createdAt:desc", populate: "*")
        return type === 'value' ? encoded.replaceAll('%3A', ':').replaceAll('%2A', '*') : encoded
      },
    })
  }
  return url.toString()
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Core API request function
 */
export async function apiRequest<T = unknown, P = Record<string, unknown>>(
  url: string,
  options: ApiOptions<P>
): Promise<TStrapiResponse<T>> {
  const { method, payload, timeoutMs = 8000, authToken } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method,
        headers,
        body: method === 'GET' || method === 'DELETE'
          ? undefined
          : JSON.stringify(payload ?? {}),
      },
      timeoutMs
    )

    if (method === 'DELETE') {
      return response.ok
        ? { data: true as T, success: true, status: response.status }
        : {
            error: {
              status: response.status,
              name: 'Error',
              message: 'Failed to delete resource',
            },
            success: false,
            status: response.status,
          }
    }

    const data = await response.json()

    if (!response.ok) {
      if (response.status !== 401 && response.status !== 402) {
        console.error(`API ${method} error (${response.status}):`, { url, data })
      }

      return {
        error: data.error ?? {
          status: response.status,
          name: 'Error',
          message: response.statusText || 'An error occurred',
        },
        success: false,
        status: response.status,
      }
    }

    return {
      data: (data.data ?? data) as T,
      meta: data.meta,
      success: true,
      status: response.status,
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return {
        error: { status: 408, name: 'TimeoutError', message: 'Request timed out' },
        success: false,
        status: 408,
      }
    }

    console.error(`Network error on ${method} ${url}:`, error)
    return {
      error: {
        status: 500,
        name: 'NetworkError',
        message: error instanceof Error ? error.message : 'Something went wrong',
      },
      success: false,
      status: 500,
    }
  }
}

/**
 * Base API methods
 */
export const api = {
  get: <T>(url: string, options?: { timeoutMs?: number; authToken?: string }) =>
    apiRequest<T>(url, { method: 'GET', ...options }),

  post: <T, P = Record<string, unknown>>(url: string, payload: P, options?: { timeoutMs?: number; authToken?: string }) =>
    apiRequest<T, P>(url, { method: 'POST', payload, ...options }),

  put: <T, P = Record<string, unknown>>(url: string, payload: P, options?: { timeoutMs?: number; authToken?: string }) =>
    apiRequest<T, P>(url, { method: 'PUT', payload, ...options }),

  patch: <T, P = Record<string, unknown>>(url: string, payload: P, options?: { timeoutMs?: number; authToken?: string }) =>
    apiRequest<T, P>(url, { method: 'PATCH', payload, ...options }),

  delete: <T>(url: string, options?: { timeoutMs?: number; authToken?: string }) =>
    apiRequest<T>(url, { method: 'DELETE', ...options }),
}

type RequestOptions = {
  timeoutMs?: number
  authToken?: string
}

/**
 * Strapi collection API (plural endpoints like /api/articles)
 */
function collection(pluralApiId: string) {
  return {
    find: <T>(query?: QueryOptions, options?: RequestOptions) =>
      api.get<T[]>(buildUrl(pluralApiId, query), options),

    findOne: <T>(documentId: string, query?: QueryOptions, options?: RequestOptions) =>
      api.get<T>(buildUrl(`${pluralApiId}/${documentId}`, query), options),

    create: <T, P = Record<string, unknown>>(payload: { data: P }, options?: RequestOptions) =>
      api.post<T, { data: P }>(buildUrl(pluralApiId), payload, options),

    update: <T, P = Record<string, unknown>>(documentId: string, payload: { data: P }, options?: RequestOptions) =>
      api.put<T, { data: P }>(buildUrl(`${pluralApiId}/${documentId}`), payload, options),

    delete: <T>(documentId: string, options?: RequestOptions) =>
      api.delete<T>(buildUrl(`${pluralApiId}/${documentId}`), options),
  }
}

/**
 * Strapi single-type API (singular endpoints like /api/homepage)
 */
function single(singularApiId: string) {
  return {
    find: <T>(query?: QueryOptions, options?: RequestOptions) =>
      api.get<T>(buildUrl(singularApiId, query), options),

    update: <T, P = Record<string, unknown>>(payload: { data: P }, options?: RequestOptions) =>
      api.put<T, { data: P }>(buildUrl(singularApiId), payload, options),

    delete: <T>(options?: RequestOptions) =>
      api.delete<T>(buildUrl(singularApiId), options),
  }
}

/**
 * Strapi API client
 *
 * @example
 * // Collection types
 * const { data } = await strapi.collection('articles').find({ populate: '*' })
 * const { data } = await strapi.collection('articles').findOne('abc123', { populate: { author: true } })
 * await strapi.collection('articles').create({ data: { title: 'Hello' } })
 * await strapi.collection('articles').update('abc123', { data: { title: 'Updated' } })
 * await strapi.collection('articles').delete('abc123')
 *
 * // Single types
 * const { data } = await strapi.single('homepage').find({ populate: '*' })
 * await strapi.single('homepage').update({ data: { title: 'Welcome' } })
 */
export const strapi = {
  collection,
  single,
  api,
}
