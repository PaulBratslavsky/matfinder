import qs from 'qs';
import { Platform } from 'react-native';

/** The server refused a request that needs an account (401/403); the app shows the sign-in prompt. */
export class AuthRequiredError extends Error {
  constructor(public status: number) {
    super('Sign in required');
    this.name = 'AuthRequiredError';
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** The server's error name, e.g. ALREADY_CLAIMED. */
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Base URL of the Strapi API. Native apps call Strapi directly (EXPO_PUBLIC_STRAPI_URL). On the web it's
 * EXPO_PUBLIC_WEB_API_BASE: the Strapi origin in development, empty in production, where Vercel rewrites the
 * same-origin /api path to Strapi so the session cookie stays first-party.
 */
export function apiBase(): string {
  if (Platform.OS === 'web') return process.env.EXPO_PUBLIC_WEB_API_BASE ?? '';
  return process.env.EXPO_PUBLIC_STRAPI_URL ?? 'http://localhost:1339';
}

let cookieProvider: (() => string | Promise<string>) | null = null;

/** Native only: the auth client registers how to read the session cookie (Better Auth's getCookie). */
export function setCookieProvider(fn: () => string | Promise<string>) {
  cookieProvider = fn;
}

/**
 * GET a Strapi path with a qs-encoded query. Native sends the session as an explicit Cookie header (no browser
 * cookie jar); the web relies on the browser's cookies with `credentials: 'include'`.
 */
export async function apiGet<T>(path: string, query?: Record<string, unknown>): Promise<T> {
  const search = query ? qs.stringify(query, { addQueryPrefix: true, encodeValuesOnly: true }) : '';
  return request<T>(`${path}${search}`, { method: 'GET' });
}

/** POST JSON to a Strapi path, with the session like apiGet. */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body), json: true });
}

async function request<T>(path: string, opts: { method: 'GET' | 'POST'; body?: string; json?: boolean }): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...(opts.json ? { 'Content-Type': 'application/json' } : {}) };
  if (Platform.OS !== 'web' && cookieProvider) {
    const cookie = await cookieProvider();
    if (cookie) headers.Cookie = cookie;
  }
  const res = await fetch(`${apiBase()}${path}`, {
    method: opts.method,
    headers,
    body: opts.body,
    credentials: Platform.OS === 'web' ? 'include' : 'omit',
  });
  if (res.status === 401 || res.status === 403) throw new AuthRequiredError(res.status);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.message ?? `Request failed (${res.status})`, body?.error?.name);
  }
  return res.json() as Promise<T>;
}
