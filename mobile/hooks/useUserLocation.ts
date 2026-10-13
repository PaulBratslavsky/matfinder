import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import type { Coordinates } from '@/lib/geo';

type State = { status: 'pending' | 'granted' | 'denied'; location: Coordinates | null };

/**
 * The device location, if the user allows it. Callers fall back to the city center when it's null, and hide
 * distances (the spec: distance only with permission).
 */
export function useUserLocation() {
  const [state, setState] = useState<State>({ status: 'pending', location: null });

  const locate = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return setState({ status: 'denied', location: null });
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setState({ status: 'granted', location: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } });
    } catch {
      setState({ status: 'denied', location: null });
    }
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  return { ...state, locate };
}
