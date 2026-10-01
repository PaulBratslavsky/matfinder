import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { NextSession } from '@/components/explore/NextSession';
import { AmenityList } from '@/components/school/AmenityList';
import { ContactLinks } from '@/components/school/ContactLinks';
import { Description } from '@/components/school/Description';
import { DirectionsButton } from '@/components/school/DirectionsButton';
import { Gallery } from '@/components/school/Gallery';
import { InstructorList } from '@/components/school/InstructorList';
import LocationMap from '@/components/school/LocationMap';
import { PricingCard } from '@/components/school/PricingCard';
import { ProgramChips } from '@/components/school/ProgramChips';
import { ScheduleTable } from '@/components/school/ScheduleTable';
import { SchoolHeader } from '@/components/school/SchoolHeader';
import { Section } from '@/components/school/Section';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useCityNow } from '@/hooks/useCityNow';
import { useSchool } from '@/hooks/useSchool';
import { useSession } from '@/hooks/useSession';
import { ApiError, AuthRequiredError } from '@/lib/api/client';

function Centered({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 items-center justify-center gap-4 bg-background p-6">{children}</View>;
}

/** The full school page. Account-only: without a session it sends the user to sign in and back here. */
export default function SchoolScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const session = useSession();
  const school = useSchool(slug);
  const now = useCityNow(school.data?.city?.timezone);
  const signIn = { pathname: '/sign-in', params: { redirect: `/schools/${slug}` } } as const;

  if (session.isPending) {
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    );
  }
  // Signed out, or the session expired mid-use (the server answered 401/403).
  if (!session.data?.user || school.error instanceof AuthRequiredError) return <Redirect href={signIn} />;
  if (school.error) {
    const notFound = school.error instanceof ApiError && school.error.status === 404;
    return (
      <Centered>
        <Stack.Screen options={{ title: notFound ? 'Not found' : 'School' }} />
        <Text variant="h4">{notFound ? 'School not found' : "Couldn't load this school"}</Text>
        <Button variant="outline" onPress={() => (notFound ? router.replace('/') : school.refetch())}>
          <Text>{notFound ? 'Back to Explore' : 'Try again'}</Text>
        </Button>
      </Centered>
    );
  }
  if (!school.data) {
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    );
  }

  const s = school.data;
  return (
    <>
      <Stack.Screen options={{ title: s.name }} />
      <ScrollView className="flex-1 bg-background" contentContainerClassName="w-full max-w-3xl gap-8 self-center p-4 pb-16">
        <View className="gap-4">
          <SchoolHeader school={s} today={now?.localDate ?? null} />
          {!!s.shortDescription && <Text className="leading-6">{s.shortDescription}</Text>}
          {now && <NextSession sessions={s.todaySessions} now={now} />}
          <ProgramChips programs={s.programs} styles={s.styles} />
        </View>
        <Gallery images={s.gallery} />
        <Section title="Schedule">
          <ScheduleTable schedule={s.schedule} now={now} />
          {!!s.city && <Text variant="muted">Times are local to {s.city.name}.</Text>}
        </Section>
        <Section title="Pricing">
          <PricingCard pricing={s.pricing} />
        </Section>
        <Section title="Instructors">
          <InstructorList instructors={s.headInstructors} />
        </Section>
        <Section title="Amenities">
          <AmenityList amenities={s.amenities} />
        </Section>
        {!!s.location && (
          <Section title="Location">
            <LocationMap latitude={s.location.latitude} longitude={s.location.longitude} />
            {!!s.location.address && <Text>{s.location.address}</Text>}
            <View className="flex-row">
              <DirectionsButton latitude={s.location.latitude} longitude={s.location.longitude} name={s.name} />
            </View>
          </Section>
        )}
        <Section title="Contact">
          <ContactLinks contact={s.contact} />
          {!!s.affiliation?.website && <Text variant="muted">Team site: {s.affiliation.website.replace(/^https?:\/\//, '')}</Text>}
        </Section>
        {!!s.description?.length && (
          <Section title="About">
            <Description blocks={s.description} />
          </Section>
        )}
      </ScrollView>
    </>
  );
}
