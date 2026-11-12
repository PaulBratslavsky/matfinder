import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import type { Coordinates } from '@/lib/geo';

/** checking: reading the permission; ask: not decided yet (Explore offers "Use my location"); granted; denied. */
export type LocationStatus = 'checking' | 'ask' | 'granted' | 'denied';
type State = { status: LocationStatus; location: Coordinates | null };

/**
 * The device location, if the user allows it. Opening a screen never shows the system prompt: it reads the permission,
 * and only `ask()` (a tap on "Use my location") prompts. Callers fall back to the city center when the location is
 * null, and hide distances (03 › F7).
 */
export function useUserLocation() {
  const [state, setState] = useState<State>({ status: 'checking', location: null });

  const read = useCallback(async () => {
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setState({ status: 'granted', location: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } });
    } catch {
      setState({ status: 'denied', location: null });
    }
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      let status: Location.PermissionStatus | null = null;
      try {
        ({ status } = await Location.getForegroundPermissionsAsync());
      } catch {
        status = null; // the web without navigator.permissions: treat as not decided
      }
      if (!live) return;
      if (status === Location.PermissionStatus.GRANTED) return void read();
      setState({ status: status === Location.PermissionStatus.DENIED ? 'denied' : 'ask', location: null });
    })();
    return () => {
      live = false;
    };
  }, [read]);

  /** The system prompt, after the user tapped "Use my location". */
  const ask = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) return setState({ status: 'denied', location: null });
      await read();
    } catch {
      setState({ status: 'denied', location: null });
    }
  }, [read]);

  /** Pull-to-refresh and the Refresh button: a new position only when already allowed. Never prompts. */
  const refresh = useCallback(() => {
    if (state.status === 'granted') void read();
  }, [state.status, read]);

  return { ...state, ask, refresh };
}
