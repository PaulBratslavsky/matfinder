import { Link, type Href } from 'expo-router';
import { X } from 'lucide-react-native';
import { Platform, Pressable, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { DirectorySchool } from '@/lib/api/schools';
import { formatMiles } from '@/lib/geo';
import type { CityNow } from '@/lib/time';
import { cn } from '@/lib/utils';
import { NextSession } from './NextSession';
import { SchoolBadges } from './SchoolMeta';
import { SchoolLogo } from './SchoolLogo';

/**
 * The tapped school: "can I train here tonight, and what does it cost?" A bottom sheet on native, a floating card on
 * the web. "View school" opens the account-only school page.
 */
export function PreviewCard({
  school,
  now,
  distanceMiles,
  onClose,
}: {
  school: DirectorySchool;
  now: CityNow;
  distanceMiles: number | null;
  onClose: () => void;
}) {
  const subtitle = [school.affiliation, school.neighborhood].filter(Boolean).join(' · ');
  return (
    <View
      accessibilityLabel={`${school.name} preview`}
      className={cn(
        'gap-3 border border-border bg-card p-4 shadow-lg shadow-black/10',
        Platform.OS === 'web' ? 'w-full max-w-md rounded-xl' : 'rounded-t-2xl pb-6',
      )}>
      <View className="flex-row items-start gap-3">
        <SchoolLogo name={school.name} url={school.logo?.url} size={52} />
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-semibold leading-tight">{school.name}</Text>
          {!!subtitle && <Text variant="muted">{subtitle}</Text>}
          {distanceMiles != null && <Text variant="muted">{formatMiles(distanceMiles)} away</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close preview" onPress={onClose} className="-m-1 p-1">
          <Icon as={X} className="size-5 text-muted-foreground" />
        </Pressable>
      </View>
      <NextSession sessions={school.todaySessions} now={now} />
      <SchoolBadges school={school} />
      {/* The account-only school page (app/schools/[slug].tsx) arrives with the auth UI in M7. */}
      <Link href={`/schools/${school.slug}` as Href} asChild>
        <Button>
          <Text>View school</Text>
        </Button>
      </Link>
    </View>
  );
}
