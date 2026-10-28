import '../global.css';

import { PortalHost } from '@rn-primitives/portal';
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { AuthProvider } from '@/hooks/useSession';
import { fontFiles } from '@/theme/fonts';
import { NAV_THEME } from '@/theme/navigation';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

// On native, React Query learns about connectivity and app focus from expo-network and AppState
// (the browser events cover the web).
if (Platform.OS !== 'web') {
  onlineManager.setEventListener((setOnline) => {
    const sub = Network.addNetworkStateListener((state) => setOnline(!!state.isConnected));
    return () => sub.remove();
  });
}

// Keep the splash screen up until the fonts are ready, so text never flashes in the system font.
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: true, refetchOnReconnect: true } },
});

/** The navigator, its headers and the status bar, in the current light/dark theme. */
function ThemedStack() {
  const { scheme, colors, fonts } = useTheme();
  return (
    <NavigationThemeProvider value={NAV_THEME[scheme]}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.label, fontSize: 18 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false, title: 'MatFinder' }} />
        <Stack.Screen name="schools/[slug]/index" options={{ headerShown: false, title: 'Gym' }} />
        <Stack.Screen name="schools/[slug]/claim" options={{ title: 'Claim this gym' }} />
        {/* "Ask about this gym": a sheet over the gym page on iOS and Android, a page on the web. */}
        <Stack.Screen name="schools/[slug]/ask" options={{ title: 'Ask about this gym', presentation: Platform.OS === 'web' ? 'card' : 'modal' }} />
        <Stack.Screen name="account" options={{ title: 'Account' }} />
        <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
        <Stack.Screen name="sign-up" options={{ title: 'Create account' }} />
        <Stack.Screen name="+not-found" options={{ title: 'Not found' }} />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <PortalHost />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontFiles);
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (status) => focusManager.setFocused(status === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <ThemedStack />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
