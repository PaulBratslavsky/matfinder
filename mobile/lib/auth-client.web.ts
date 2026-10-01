// Web auth client: browser cookies. In production EXPO_PUBLIC_WEB_API_BASE is empty and /api is same-origin through
// the Vercel rewrite; Better Auth rejects a relative baseURL, so the page origin is prepended.
import { createAuthClient } from 'better-auth/react';

const base = process.env.EXPO_PUBLIC_WEB_API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');

export const authClient = createAuthClient({
  baseURL: `${base}/api/auth`,
  fetchOptions: { credentials: 'include' },
});
