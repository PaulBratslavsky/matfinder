// Native auth client: the session cookie lives in SecureStore and rides API calls as a Cookie header.
import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { setCookieProvider } from './api/client';

export const authClient = createAuthClient({
  baseURL: `${process.env.EXPO_PUBLIC_STRAPI_URL ?? 'http://localhost:1339'}/api/auth`,
  plugins: [expoClient({ scheme: 'matfinder', storagePrefix: 'matfinder', storage: SecureStore })],
});

setCookieProvider(() => authClient.getCookie());
