import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocationMap, type CameraPadding, type MapCamera, type MapLocation, type MapMarker } from '@/components/LocationMap';
import { ActionButton, RankBar, RoundButton } from '@/components/kit';
import { FilterBar } from '@/components/explore/FilterBar';
import { SchoolCard } from '@/components/explore/SchoolCard';
import { SchoolPreview } from '@/components/explore/SchoolPreview';
import { SheetSearch } from '@/components/explore/SheetSearch';
import { SortToggle } from '@/components/explore/SortToggle';
import { useDirectory } from '@/hooks/useDirectory';
import { useUserLocation } from '@/hooks/useUserLocation';
import { GROUPS, pinTone, sessionState, sortItems, type ExploreItem, type SortKey } from '@/lib/explore';
import { applyFilters, filtersToParams, hasActiveFilters, NO_FILTERS, parseFilters, type Filters } from '@/lib/filters';
import { getDistanceMiles } from '@/lib/geo';
import { hasMapboxToken } from '@/lib/mapbox';
import { formatTime, isTrainingToday, type CityNow } from '@/lib/time';
import { dayShort } from '@/lib/week';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

/** Center on the device only when it's in the city's area; someone planning a trip from elsewhere sees the city. */
const NEAR_CITY_MILES = 60;
/** At this width the sheet becomes a panel on the left of the map. */
const WIDE = 768;
const PANEL_WIDTH = 400;

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const clock = (now: CityNow) => `${dayShort(now.weekday)} ${formatTime(hhmm(now.minutes))}`;

/**
 * Explore, on metravel-explore's layout: the map fills the screen and a bottom sheet holds the search, the filters
 * and the gyms (a left panel on wide screens). Tapping a pin or a card centers it and turns the sheet into that
 * gym's preview. Filters, sort and the selected gym live in the URL.
 */
export default function ExploreScreen() {
  const styles = useStyles();
  const { colors, layout } = useTheme();
  const params = useLocalSearchParams<{ q?: string; today?: string; visitors?: string; style?: string; openmat?: string; school?: string; sort?: string }>();
  const filters = useMemo(() => parseFilters(params), [params]);
  const sort: SortKey = params.sort === 'distance' ? 'distance' : 'time';
  const selectedSlug = params.school || null;
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const wide = window.width >= WIDE;

  const { data, now, isPending, error, refetch, isFetching } = useDirectory();
  const user = useUserLocation();

  const setFilters = useCallback((f: Filters) => router.setParams(filtersToParams(f)), []);
  const setSort = useCallback((s: SortKey) => router.setParams({ sort: s === 'distance' ? 'distance' : undefined }), []);
  const select = useCallback((slug: string | null) => router.setParams({ school: slug ?? undefined }), []);

  const distances = useMemo(
    () => (data && user.location ? new Map(data.schools.map((s) => [s.slug, getDistanceMiles(user.location!, s)])) : null),
    [data, user.location],
  );
  const items: ExploreItem[] = useMemo(() => {
    if (!data || !now) return [];
    return applyFilters(data.schools, filters, now).map((school) => ({
      school,
      state: sessionState(school.todaySessions, now),
      distance: distances?.get(school.slug) ?? null,
    }));
  }, [data, now, filters, distances]);
  const sections = useMemo(() => sortItems(items, sort), [items, sort]);
  const trainingToday = useMemo(() => (data && now ? data.schools.filter((s) => isTrainingToday(s.todaySessions, now)).length : 0), [data, now]);
  const selected = data?.schools.find((s) => s.slug === selectedSlug) ?? null;

  const markers: MapMarker[] = useMemo(() => {
    if (!now) return [];
    // A deep-linked gym stays on the map even when the filters would hide it.
    const shown = selected && !items.some((i) => i.school.slug === selected.slug) ? [...items.map((i) => i.school), selected] : items.map((i) => i.school);
    return shown.map((s) => {
      const state = sessionState(s.todaySessions, now);
      return {
        id: s.slug,
        longitude: s.longitude,
        latitude: s.latitude,
        name: s.name,
        tone: pinTone(state),
        tag: state.kind === 'live' ? 'On now' : state.kind === 'upcoming' ? formatTime(state.session.start) : null,
      };
    });
  }, [items, selected, now]);

  // The recenter target: the device when it's near the city, else the city center.
  const nearCity = !!data && !!user.location && getDistanceMiles(user.location, data.city.center) <= NEAR_CITY_MILES;
  const location: MapLocation | null = useMemo(() => {
    if (!data) return null;
    const c = nearCity ? user.location! : data.city.center;
    return { longitude: c.longitude, latitude: c.latitude, zoom: data.city.defaultZoom, pitch: 0, bearing: 0 };
  }, [data, nearCity, user.location]);

  // Where the map looks: the selected gym; else the device (near the city, no filters); else every listed gym.
  // The map moves only when `key` changes. The fit key comes from the filters, not the list: with "Training today"
  // on, the list shrinks as classes end, and the map must not re-fit (and undo the user's pan) each time.
  const filtersKey = `${filters.q.trim()}|${filters.today}|${filters.visitors}|${filters.style ?? ''}|${filters.openMat}`;
  const camera: MapCamera | undefined = useMemo(() => {
    if (!data || !location) return undefined;
    if (selected) return { key: `gym:${selected.slug}`, center: { longitude: selected.longitude, latitude: selected.latitude }, zoom: 14 };
    if (nearCity && !hasActiveFilters(filters)) return { key: `near:${location.latitude},${location.longitude}`, center: location, zoom: data.city.defaultZoom };
    if (!items.length) return { key: `city:${filtersKey}`, center: data.city.center, zoom: data.city.defaultZoom };
    const lngs = items.map((i) => i.school.longitude);
    const lats = items.map((i) => i.school.latitude);
    const [west, south, east, north] = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
    // One gym, or a few on the same block: center at street level instead of fitting a box that's almost a point.
    if (east - west < 0.005 && north - south < 0.005) {
      return { key: `fit:${filtersKey}`, center: { longitude: (west + east) / 2, latitude: (south + north) / 2 }, zoom: 14 };
    }
    return {
      key: `fit:${filtersKey}`,
      bounds: [
        [west, south],
        [east, north],
      ],
    };
  }, [data, location, selected, nearCity, filters, filtersKey, items]);

  // Keep pins clear of the sheet (or side panel), the map buttons and the zoom card.
  const sheetHeight = Math.round(window.height * layout.sheetFraction);
  const padding: CameraPadding = useMemo(
    () =>
      wide
        ? { top: insets.top + 72, right: 72, bottom: 40, left: PANEL_WIDTH + 48 }
        : { top: insets.top + 72, right: 64, bottom: sheetHeight + 16, left: 40 },
    [wide, insets.top, sheetHeight],
  );

  const handleRefresh = useCallback(async () => {
    await refetch();
    user.locate();
  }, [refetch, user]);

  if (isPending || (data && !now)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.redText} />
        <Text style={styles.loadingText}>Loading gyms…</Text>
      </View>
    );
  }

  // A failed background refetch keeps the cached list on screen; the error screen is for having nothing to show.
  if (!data || !now || !location) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error?.message ?? 'Check your connection and try again.'}</Text>
        <ActionButton label="Try again" icon="refresh" onPress={() => refetch()} style={styles.retry} />
      </View>
    );
  }

  const accountButton = (
    <Pressable accessibilityRole="button" accessibilityLabel="Account" onPress={() => router.push('/account')} style={styles.mapButton}>
      <Ionicons name="person-outline" size={22} color={colors.text} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {hasMapboxToken ? (
        <>
          <LocationMap
            location={location}
            showMarker={false}
            showControls
            controlsTop={insets.top + 68}
            showUserLocation={user.status === 'granted'}
            markers={markers}
            selectedMarkerId={selectedSlug}
            camera={camera}
            cameraPadding={padding}
            onMarkerSelect={(marker) => select(marker.id)}
          />
          {!wide && (
            <View aria-hidden style={[styles.mapButton, styles.brand, { top: insets.top + 12 }]}>
              <RankBar stripes={2} width={30} />
            </View>
          )}
          <View style={[styles.account, { top: insets.top + 12 }]}>{accountButton}</View>
        </>
      ) : (
        <View style={styles.mapUnavailable} />
      )}

      <View
        style={[
          styles.sheet,
          wide ? [styles.panel, { width: PANEL_WIDTH }] : hasMapboxToken ? { height: sheetHeight } : { top: insets.top + 8 },
        ]}>
        {!wide && <View style={styles.handle} />}
        {selected ? (
          <SchoolPreview school={selected} state={sessionState(selected.todaySessions, now)} now={now} distanceMiles={distances?.get(selected.slug) ?? null} onBack={() => select(null)} />
        ) : (
          <>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.kicker}>
                  MatFinder · {data.city.name} · {clock(now)}
                </Text>
                <Text role="heading" style={styles.title}>
                  {trainingToday} of {data.schools.length} training today
                </Text>
              </View>
              {!hasMapboxToken && accountButton}
              <RoundButton label="Refresh" onPress={handleRefresh}>
                {isFetching ? <ActivityIndicator size="small" color={colors.text} /> : <Ionicons name="refresh" size={18} color={colors.text} />}
              </RoundButton>
            </View>
            {!hasMapboxToken && (
              <View style={styles.notice}>
                <Ionicons name="map-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.noticeText}>The map needs a Mapbox token. Every gym is still listed below.</Text>
              </View>
            )}
            <SheetSearch value={filters.q} onChange={(q) => setFilters({ ...filters, q })} />
            <FilterBar filters={filters} onChange={setFilters} trainingToday={trainingToday} />
            <View style={styles.sortRow}>
              <Text style={styles.count} accessibilityLiveRegion="polite">
                Showing {items.length} of {data.schools.length}
              </Text>
              <SortToggle value={sort} onChange={setSort} />
            </View>

            {items.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="location-outline" size={32} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>No gyms match</Text>
                <Text style={styles.emptyText}>Try a different search, or turn off a filter: they all have to match.</Text>
                {hasActiveFilters(filters) && (
                  <Pressable accessibilityRole="button" onPress={() => setFilters(NO_FILTERS)} hitSlop={8}>
                    <Text style={styles.emptyAction}>Clear search and filters</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {sections.map(({ group, items: groupItems }) => (
                  <View key={group ?? 'all'} style={styles.section}>
                    {group && (
                      <Text style={[styles.groupLabel, group === 'live' && styles.groupLive, group === 'none' && styles.groupNone]}>
                        {GROUPS.find((g) => g.key === group)!.label} · {groupItems.length}
                      </Text>
                    )}
                    {groupItems.map(({ school, state, distance }) => (
                      <SchoolCard key={school.slug} school={school} state={state} now={now} distanceMiles={distance} onPress={() => select(school.slug)} />
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 8, backgroundColor: t.colors.bg },
  loadingText: { ...t.type.label, marginTop: 8, fontSize: 15, color: t.colors.textSecondary },
  errorTitle: { ...t.type.display, fontSize: 28, color: t.colors.text, textAlign: 'center' },
  errorMessage: { ...t.type.body, fontSize: 15, lineHeight: 22, color: t.colors.textSecondary, textAlign: 'center' },
  retry: { marginTop: 12, paddingHorizontal: 20 },
  mapUnavailable: { flex: 1, backgroundColor: t.colors.bg },
  mapButton: {
    width: 44,
    height: 44,
    borderRadius: t.radii.field,
    backgroundColor: t.colors.overlay,
    boxShadow: `0 4px 16px ${t.colors.shadow}`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { position: 'absolute', left: 12 },
  account: { position: 'absolute', right: 12 },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: t.colors.sheet,
    borderTopLeftRadius: t.radii.sheet,
    borderTopRightRadius: t.radii.sheet,
    boxShadow: `0 -8px 30px ${t.colors.shadow}`,
    overflow: 'hidden',
  },
  panel: { top: 12, bottom: 12, left: 12, right: undefined, borderRadius: t.radii.sheet, paddingTop: 8, boxShadow: `0 8px 30px ${t.colors.shadow}` },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: t.colors.handle, alignSelf: 'center', marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: t.layout.gutter, paddingTop: 10, paddingBottom: 12 },
  headerText: { flex: 1 },
  kicker: { ...t.type.label, fontSize: 13, letterSpacing: 1.6, color: t.colors.redText },
  title: { ...t.type.display, fontSize: 30, lineHeight: 32, color: t.colors.text },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: t.layout.gutter, marginBottom: 10 },
  noticeText: { ...t.type.body, flex: 1, fontSize: 13, color: t.colors.textSecondary },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: t.layout.gutter, paddingTop: 10, paddingBottom: 6 },
  count: { ...t.type.label, fontSize: 13, letterSpacing: 1.2, color: t.colors.textSecondary },
  list: { flex: 1 },
  listContent: { paddingHorizontal: t.layout.gutter, paddingBottom: 40, gap: 8 },
  section: { gap: 8 },
  groupLabel: { ...t.type.heavy, fontSize: 14, letterSpacing: 1.4, color: t.colors.text, marginTop: 6 },
  groupLive: { color: t.colors.liveText },
  groupNone: { color: t.colors.textSecondary },
  empty: { alignItems: 'center', padding: 24, gap: 4 },
  emptyTitle: { ...t.type.heavy, fontSize: 20, color: t.colors.text, marginTop: 8 },
  emptyText: { ...t.type.body, fontSize: 15, color: t.colors.textSecondary, textAlign: 'center' },
  emptyAction: { ...t.type.label, fontSize: 15, color: t.colors.redText, marginTop: 12 },
}));
