import { useEffect, useState } from 'react';
import { cityNow, type CityNow } from '@/lib/time';

/** City-local "now", re-evaluated every 30 seconds so "On now" and "Training today" stay current. */
export function useCityNow(timeZone: string | undefined): CityNow | null {
  const [now, setNow] = useState(() => (timeZone ? cityNow(timeZone) : null));
  useEffect(() => {
    if (!timeZone) return;
    setNow(cityNow(timeZone));
    const id = setInterval(() => setNow(cityNow(timeZone)), 30_000);
    return () => clearInterval(id);
  }, [timeZone]);
  return now;
}
