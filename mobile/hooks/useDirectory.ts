import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getDirectory } from '@/lib/api/schools';
import { useCityNow } from './useCityNow';

export const DEFAULT_CITY = process.env.EXPO_PUBLIC_DEFAULT_CITY || 'las-vegas';

/**
 * The public directory for a city, plus the city-local "now". Fresh for 60 s, refetched when the app regains focus
 * (see the focus manager in app/_layout.tsx) and when the city-local date rolls over, since `todaySessions` is
 * computed by the server for one day.
 */
export function useDirectory(citySlug: string = DEFAULT_CITY) {
  const query = useQuery({
    queryKey: ['directory', citySlug],
    queryFn: () => getDirectory(citySlug),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
  const now = useCityNow(query.data?.city.timezone);
  const { refetch } = query;
  const stale = !!query.data && !!now && now.localDate !== query.data.localDate;
  // After midnight, refetch until the server's date catches up: the first refetch can still get yesterday's list
  // from an HTTP cache (Cache-Control max-age=60).
  useEffect(() => {
    if (!stale) return;
    refetch();
    const id = setInterval(() => refetch(), 60_000);
    return () => clearInterval(id);
  }, [stale, refetch]);
  return { ...query, now };
}
