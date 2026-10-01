import '../global.css';

import { PortalHost } from '@rn-primitives/portal';
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { NAV_THEME } from '@/lib/theme';

// On native, React Query learns about connectivity and app focus from expo-network and AppState
// (the browser events cover the web).
if (Platform.OS !== 'web') {
  onlineManager.setEventListener((setOnline) => {
    const sub = Network.addNetworkStateListener((state) => setOnline(!!state.isConnected));
    return () => sub.remove();
  });
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: true, refetchOnReconnect: true } },
});

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (status) => focusManager.setFocused(status === 'active'));
    return () => sub.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={NAV_THEME.light}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ title: 'Not found' }} />
        </Stack>
        <StatusBar style="dark" />
        <PortalHost />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
