import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocationMap, type LocationMapRef, type MapLocation, type MapMarker } from '@/components/LocationMap';
import { FilterPills } from '@/components/explore/FilterPills';
import { IOS } from '@/components/explore/ios';
import { SchoolCard } from '@/components/explore/SchoolCard';
import { SchoolPreview } from '@/components/explore/SchoolPreview';
import { SheetSearch } from '@/components/explore/SheetSearch';
import { useDirectory } from '@/hooks/useDirectory';
import { useUserLocation } from '@/hooks/useUserLocation';
import type { DirectorySchool } from '@/lib/api/schools';
import { applyFilters, filtersToParams, hasActiveFilters, NO_FILTERS, parseFilters, type Filters } from '@/lib/filters';
import { getDistanceMiles } from '@/lib/geo';
import { hasMapboxToken } from '@/lib/mapbox';

/** Center on the device only when it's in the city's area; someone planning a trip from elsewhere sees the city. */
const NEAR_CITY_MILES = 60;

/**
 * Explore, laid out like metravel-explore's home screen: the map fills the screen and a bottom sheet holds the
 * search, the filters and the school cards. Tapping a pin or a card flies the map there and turns the sheet into
 * that school's preview. Filters and the selected school live in the URL.
 */
export default function ExploreScreen() {
  const params = useLocalSearchParams<{ q?: string; today?: string; visitors?: string; style?: string; school?: string }>();
  const filters = useMemo(() => parseFilters(params), [params]);
  const selectedSlug = params.school || null;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<LocationMapRef>(null);

  const { data, now, isPending, isError, error, refetch, isFetching } = useDirectory();
  const user = useUserLocation();

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
  const markers: MapMarker[] = useMemo(
    () =>
      schools.map((s) => ({
        id: s.slug,
        longitude: s.longitude,
        latitude: s.latitude,
        name: s.name,
        address: [s.neighborhood, s.affiliation].filter(Boolean).join(' · '),
      })),
    [schools],
  );

  const focus = useCallback(
    (school: Pick<DirectorySchool, 'slug' | 'longitude' | 'latitude'>) => {
      select(school.slug);
      mapRef.current?.flyTo({ longitude: school.longitude, latitude: school.latitude, zoom: 14 });
    },
    [select],
  );

  // Stable map center: the device when it's near the city, else the city center.
  const location: MapLocation | null = useMemo(() => {
    if (!data) return null;
    const near = !!user.location && getDistanceMiles(user.location, data.city.center) <= NEAR_CITY_MILES;
    const c = near ? user.location! : data.city.center;
    return { longitude: c.longitude, latitude: c.latitude, zoom: data.city.defaultZoom, pitch: 0, bearing: 0 };
  }, [data, user.location]);

  const handleRefresh = useCallback(async () => {
    await refetch();
    user.locate();
  }, [refetch, user]);

  if (isPending || (data && !now)) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={IOS.blue} />
        <Text style={styles.loadingText}>Loading schools...</Text>
      </View>
    );
  }

  if (isError || !data || !now || !location) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle-outline" size={48} color={IOS.secondaryLabel} />
        </View>
        <Text style={styles.errorTitle}>Something Went Wrong</Text>
        <Text style={styles.errorMessage}>{error?.message ?? 'Check your connection and try again.'}</Text>
        <Pressable style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]} onPress={() => refetch()}>
          <Ionicons name="refresh" size={20} color={IOS.white} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const selected = data.schools.find((s) => s.slug === selectedSlug) ?? null;

  return (
    <View style={styles.container}>
      {hasMapboxToken ? (
        <LocationMap
          location={location}
          showMarker={false}
          mapRef={mapRef}
          showControls
          showUserLocation={user.status === 'granted'}
          markers={markers}
          selectedMarkerId={selectedSlug}
          onMarkerSelect={(marker) => {
            const school = data.schools.find((s) => s.slug === marker.id);
            if (school) focus(school);
          }}
        />
      ) : (
        <View style={styles.mapUnavailable} />
      )}

      <View style={[styles.bottomSheet, !hasMapboxToken && [styles.bottomSheetFull, { top: insets.top + 8 }]]}>
        {selected ? (
          <SchoolPreview school={selected} now={now} distanceMiles={distances?.get(selected.slug) ?? null} onBack={() => select(null)} />
        ) : (
          <>
            <View style={styles.bottomSheetHeader}>
              <View style={styles.bottomSheetHandle} />
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <View style={styles.pulsingDot} />
                  <Text style={styles.headerTitle}>Schools in {data.city.name}</Text>
                </View>
                <View style={styles.headerRight}>
                  <Text style={styles.headerSubtitle} accessibilityLiveRegion="polite">
                    {schools.length} of {data.schools.length}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Refresh"
                    style={({ pressed }) => [styles.refreshButton, pressed && styles.refreshButtonPressed]}
                    onPress={handleRefresh}>
                    {isFetching ? <ActivityIndicator size="small" color={IOS.blue} /> : <Ionicons name="refresh" size={18} color={IOS.blue} />}
                  </Pressable>
                </View>
              </View>
              {!hasMapboxToken && (
                <View style={styles.notice}>
                  <Ionicons name="map-outline" size={16} color={IOS.secondaryLabel} />
                  <Text style={styles.noticeText}>The map needs a Mapbox token. Every school is still listed below.</Text>
                </View>
              )}
              <SheetSearch value={filters.q} onChange={(q) => setFilters({ ...filters, q })} />
              <FilterPills filters={filters} onChange={setFilters} />
            </View>

            {schools.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="location-outline" size={32} color={IOS.secondaryLabel} />
                <Text style={styles.emptyText}>No schools match</Text>
                <Text style={styles.emptySubtext}>Try a different search, or turn off a filter: they all have to match.</Text>
                {hasActiveFilters(filters) && (
                  <Pressable accessibilityRole="button" onPress={() => setFilters(NO_FILTERS)} hitSlop={8}>
                    <Text style={styles.emptyAction}>Clear search and filters</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <ScrollView
                style={styles.schoolList}
                contentContainerStyle={styles.schoolListContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">
                {schools.map((school) => (
                  <SchoolCard
                    key={school.slug}
                    school={school}
                    now={now}
                    distanceMiles={distances?.get(school.slug) ?? null}
                    onPress={() => focus(school)}
                  />
                ))}
              </ScrollView>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// metravel-explore's home screen styles, with MatFinder's additions (notice, empty action, full-height sheet).
const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: IOS.fill },
  loadingText: { marginTop: 16, fontSize: 17, color: IOS.secondaryLabel },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: IOS.fillPressed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: { fontSize: 20, fontWeight: '600', color: IOS.label, marginBottom: 8, textAlign: 'center' },
  errorMessage: { fontSize: 15, color: IOS.secondaryLabel, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  retryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: IOS.blue, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  retryButtonPressed: { backgroundColor: IOS.bluePressed, transform: [{ scale: 0.98 }] },
  retryButtonText: { fontSize: 17, fontWeight: '600', color: IOS.white },
  mapUnavailable: { flex: 1, backgroundColor: IOS.fill },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: IOS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomSheetFull: { maxHeight: '100%' },
  bottomSheetHeader: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: IOS.separator,
  },
  bottomSheetHandle: { width: 36, height: 5, borderRadius: 3, backgroundColor: IOS.fillPressed, alignSelf: 'center', marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: IOS.green, marginRight: 8 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: IOS.label },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerSubtitle: { fontSize: 13, color: IOS.secondaryLabel },
  refreshButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: IOS.blueTint, alignItems: 'center', justifyContent: 'center' },
  refreshButtonPressed: { backgroundColor: 'rgba(0, 122, 255, 0.2)' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  noticeText: { flex: 1, fontSize: 13, color: IOS.secondaryLabel },
  emptyContainer: { alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 17, fontWeight: '500', color: IOS.label, marginTop: 12 },
  emptySubtext: { fontSize: 15, color: IOS.secondaryLabel, marginTop: 4, textAlign: 'center' },
  emptyAction: { fontSize: 15, color: IOS.blue, marginTop: 12 },
  schoolList: { flex: 1 },
  schoolListContent: { padding: 16, paddingBottom: 100 },
});
