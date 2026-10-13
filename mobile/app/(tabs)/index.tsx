import { router, useLocalSearchParams } from 'expo-router';
import { List, Map as MapIcon } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/explore/EmptyState';
import { FilterChips } from '@/components/explore/FilterChips';
import { PreviewCard } from '@/components/explore/PreviewCard';
import { RecenterButton } from '@/components/explore/RecenterButton';
import { SchoolList } from '@/components/explore/SchoolList';
import { SearchBar } from '@/components/explore/SearchBar';
import { MapUnavailable } from '@/components/map/MapUnavailable';
import SchoolMap from '@/components/map/SchoolMap';
import { hasMapboxToken } from '@/components/map/SchoolMap.types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useDirectory } from '@/hooks/useDirectory';
import { useUserLocation } from '@/hooks/useUserLocation';
import { applyFilters, filtersToParams, NO_FILTERS, parseFilters, type Filters } from '@/lib/filters';
import { getDistanceMiles } from '@/lib/geo';

/** Center on the device only when it's in the city's area; someone planning a trip from elsewhere sees the city. */
const NEAR_CITY_MILES = 60;

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ q?: string; today?: string; visitors?: string; style?: string; school?: string }>();
  const filters = useMemo(() => parseFilters(params), [params]);
  const selectedSlug = params.school || null;

  const { data, now, isPending, isError, error, refetch } = useDirectory();
  const user = useUserLocation();
  const [view, setView] = useState<'map' | 'list'>(hasMapboxToken ? 'map' : 'list');
  const [recenterKey, setRecenterKey] = useState(0);

  const setFilters = useCallback((f: Filters) => router.setParams(filtersToParams(f)), []);
  const select = useCallback((slug: string | null) => router.setParams({ school: slug ?? undefined }), []);

  const distances = useMemo(
    () => (data && user.location ? new Map(data.schools.map((s) => [s.slug, getDistanceMiles(user.location!, s)])) : null),
    [data, user.location],
  );
  const schools = useMemo(() => {
    if (!data || !now) return [];
    const matches = applyFilters(data.schools, filters, now);
    return distances ? [...matches].sort((a, b) => distances.get(a.slug)! - distances.get(b.slug)!) : matches;
  }, [data, now, filters, distances]);

  if (isPending || (data && !now)) {
    return (
      <SafeAreaView className="flex-1 gap-3 bg-background p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </SafeAreaView>
    );
  }
  if (isError || !data || !now) {
    return (
      <SafeAreaView className="flex-1 gap-3 bg-background p-4">
        <Alert icon={MapIcon} variant="destructive">
          <AlertTitle>{"Couldn't load schools"}</AlertTitle>
          <AlertDescription>{error?.message ?? 'Check your connection and try again.'}</AlertDescription>
        </Alert>
        <Button variant="outline" onPress={() => refetch()}>
          <Text>Try again</Text>
        </Button>
      </SafeAreaView>
    );
  }

  const nearCity = !!user.location && getDistanceMiles(user.location, data.city.center) <= NEAR_CITY_MILES;
  const center = nearCity ? user.location! : data.city.center;
  const selected = data.schools.find((s) => s.slug === selectedSlug) ?? null;
  const showMap = hasMapboxToken && view === 'map';
  const empty = schools.length === 0;
  const clear = () => setFilters(NO_FILTERS);

  return (
    <View className="flex-1 bg-background">
      {showMap && (
        <View className="absolute inset-0">
          <SchoolMap
            schools={schools}
            center={center}
            zoom={data.city.defaultZoom}
            selectedSlug={selectedSlug}
            onSelect={select}
            userLocation={user.location}
            recenterKey={recenterKey}
          />
        </View>
      )}

      <SafeAreaView edges={['top']} pointerEvents="box-none" className="gap-2 px-4 pb-2 pt-2">
        <View className="w-full max-w-xl gap-2">
          <SearchBar value={filters.q} onChange={(q) => setFilters({ ...filters, q })} />
          <FilterChips filters={filters} onChange={setFilters} />
          <View className="flex-row items-center justify-between">
            <View className="rounded-full bg-background/90 px-2 py-0.5">
              <Text variant="muted" accessibilityLiveRegion="polite">
                {schools.length} of {data.schools.length} schools in {data.city.name}
              </Text>
            </View>
            {hasMapboxToken && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-background"
                onPress={() => setView(view === 'map' ? 'list' : 'map')}>
                <Icon as={view === 'map' ? List : MapIcon} className="size-4" />
                <Text>{view === 'map' ? 'List' : 'Map'}</Text>
              </Button>
            )}
          </View>
        </View>
      </SafeAreaView>

      {!showMap && (
        <SchoolList
          schools={schools}
          now={now}
          distances={distances}
          selectedSlug={selectedSlug}
          onSelect={select}
          header={
            <View className="gap-2 pb-1">
              {!hasMapboxToken && <MapUnavailable />}
              {empty && <EmptyState onClear={clear} />}
            </View>
          }
        />
      )}

      {showMap && empty && (
        <View pointerEvents="box-none" className="absolute inset-x-4 top-40 items-center">
          <View className="w-full max-w-md">
            <EmptyState onClear={clear} />
          </View>
        </View>
      )}

      {showMap && (
        <View className="absolute right-4" style={{ bottom: selected && Platform.OS !== 'web' ? 300 : 16 }}>
          <RecenterButton onPress={() => setRecenterKey((k) => k + 1)} />
        </View>
      )}

      {selected && (
        <View
          pointerEvents="box-none"
          className={Platform.OS === 'web' ? 'absolute bottom-4 left-4 right-4 items-start' : 'absolute bottom-0 left-0 right-0'}>
          <PreviewCard
            school={selected}
            now={now}
            distanceMiles={distances?.get(selected.slug) ?? null}
            onClose={() => select(null)}
          />
        </View>
      )}
    </View>
  );
}

