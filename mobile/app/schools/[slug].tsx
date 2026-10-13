import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, SectionTitle } from '@/components/kit';
import { AmenityChips } from '@/components/school/AmenityChips';
import { CoachCards } from '@/components/school/CoachCards';
import { ContactList } from '@/components/school/ContactList';
import { RestOfWeek, TodaySchedule } from '@/components/school/DaySchedule';
import { Description } from '@/components/school/Description';
import { Gallery } from '@/components/school/Gallery';
import { GetThere } from '@/components/school/GetThere';
import { NextClassCard } from '@/components/school/NextClassCard';
import { PriceTiles } from '@/components/school/PriceTiles';
import { ProgramChips } from '@/components/school/ProgramChips';
import { SchoolHeader } from '@/components/school/SchoolHeader';
import { SchoolTopBar } from '@/components/school/SchoolTopBar';
import { VisitChecklist } from '@/components/school/VisitChecklist';
import { WeekGrid } from '@/components/school/WeekGrid';
import { useCityNow } from '@/hooks/useCityNow';
import { useSchool } from '@/hooks/useSchool';
import { useSession } from '@/hooks/useSession';
import { useUserLocation } from '@/hooks/useUserLocation';
import { ApiError, AuthRequiredError } from '@/lib/api/client';
import { getDistanceMiles } from '@/lib/geo';
import { toMinutes } from '@/lib/time';
import { nextClass, restOfWeek, sessionsOn, visitChecklist, weekGrid } from '@/lib/week';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

function Centered({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  return <View style={styles.centered}>{children}</View>;
}

/** The full gym page. Account-only: without a session it sends the user to sign in and back here. */
export default function SchoolScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const session = useSession();
  const school = useSchool(slug);
  const now = useCityNow(school.data?.city?.timezone);
  const user = useUserLocation();
  const signIn = { pathname: '/sign-in', params: { redirect: `/schools/${slug}` } } as const;

  const s = school.data;
  const week = useMemo(() => {
    if (!s || !now) return null;
    const next = nextClass(s.schedule, now);
    return { next, grid: weekGrid(s.schedule, now), rest: restOfWeek(s.schedule, now), today: sessionsOn(s.schedule, now.weekday), checklist: visitChecklist(s, next) };
  }, [s, now]);

  const back = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/', params: { school: slug } }));

  if (session.isPending) {
    return (
      <Centered>
        <ActivityIndicator color={colors.redText} />
      </Centered>
    );
  }
  // Signed out, or the session expired mid-use (the server answered 401/403).
  if (!session.data?.user || school.error instanceof AuthRequiredError) return <Redirect href={signIn} />;
  if (school.error) {
    const notFound = school.error instanceof ApiError && school.error.status === 404;
    return (
      <Centered>
        <Stack.Screen options={{ title: notFound ? 'Not found' : 'Gym' }} />
        <Text style={styles.errorTitle}>{notFound ? 'Gym not found' : "Couldn't load this gym"}</Text>
        <ActionButton label={notFound ? 'Back to Explore' : 'Try again'} variant="outline" onPress={() => (notFound ? router.replace('/') : school.refetch())} />
      </Centered>
    );
  }
  if (!s) {
    return (
      <Centered>
        <ActivityIndicator color={colors.redText} />
      </Centered>
    );
  }

  const distance = user.location && s.location ? getDistanceMiles(user.location, s.location) : null;
  const tonight = week?.next?.daysAhead === 0;
  const checklistTitle = tonight && toMinutes(week!.next!.session.start) >= 17 * 60 ? 'Can I train here tonight?' : tonight ? 'Can I train here today?' : 'Can I train here?';

  return (
    <>
      <Stack.Screen options={{ title: s.name, headerShown: false }} />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
        <SchoolTopBar name={s.name} slug={s.slug} onBack={back} />
        <SchoolHeader school={s} today={now?.localDate ?? null} distanceMiles={distance} />
        {!!s.shortDescription && <Text style={styles.short}>{s.shortDescription}</Text>}
        <NextClassCard school={s} next={week?.next ?? null} now={now} />

        <SectionTitle>{checklistTitle}</SectionTitle>
        {week && <VisitChecklist items={week.checklist} />}
        <PriceTiles pricing={s.pricing} />
        <ProgramChips programs={s.programs} styles={s.styles} />

        <SectionTitle>This week</SectionTitle>
        {s.schedule.length === 0 ? (
          <Text style={styles.muted}>No classes listed yet.</Text>
        ) : (
          week &&
          now && (
            <>
              <WeekGrid rows={week.grid} />
              <TodaySchedule sessions={week.today} now={now} next={week.next} />
              <RestOfWeek days={week.rest.days} emptyDays={week.rest.emptyDays} />
            </>
          )
        )}
        {!!s.city && <Text style={[styles.muted, styles.tz]}>Times are local to {s.city.name}.</Text>}

        <SectionTitle>Coaches</SectionTitle>
        <CoachCards instructors={s.headInstructors} />

        <SectionTitle>In the gym</SectionTitle>
        <AmenityChips amenities={s.amenities} />
        {s.gallery.length > 0 && (
          <View style={styles.gallery}>
            <Gallery images={s.gallery} />
          </View>
        )}

        {!!s.location && (
          <>
            <SectionTitle>Get there</SectionTitle>
            <GetThere name={s.name} location={s.location} distanceMiles={distance} />
          </>
        )}

        <SectionTitle>Contact</SectionTitle>
        <ContactList contact={s.contact} teamWebsite={s.affiliation?.website} />

        {!!s.description?.length && (
          <>
            <SectionTitle>About</SectionTitle>
            <Description blocks={s.description} />
          </>
        )}
      </ScrollView>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: t.colors.bg },
  errorTitle: { ...t.type.display, fontSize: 28, color: t.colors.text, textAlign: 'center' },
  scroll: { flex: 1, backgroundColor: t.colors.bg },
  content: { width: '100%', maxWidth: t.layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: t.layout.gutter, paddingBottom: 48 },
  short: { ...t.type.body, fontSize: 16, lineHeight: 24, color: t.colors.chipText, marginTop: 12 },
  muted: { ...t.type.body, fontSize: 15, color: t.colors.textSecondary },
  tz: { marginTop: 12, fontSize: 13 },
  gallery: { marginTop: 16 },
}));
