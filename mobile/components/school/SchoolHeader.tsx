import { View } from 'react-native';
import { SchoolLogo } from '@/components/explore/SchoolLogo';
import { Text } from '@/components/ui/text';
import type { SchoolPage } from '@/lib/api/schools';

const STALE_DAYS = 90;

/** `2026-09-15` → `Sep 15, 2026` (a plain date: no time zone shift). */
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** `today` is the city-local date (YYYY-MM-DD), used to flag a schedule verified more than 90 days ago. */
export function SchoolHeader({ school, today }: { school: SchoolPage; today: string | null }) {
  const where = [school.neighborhood, school.city?.name].filter(Boolean).join(', ');
  const verified = school.lastVerifiedAt;
  const stale = !!verified && !!today && (Date.parse(today) - Date.parse(verified)) / 86_400_000 > STALE_DAYS;
  return (
    <View className="flex-row gap-4">
      <SchoolLogo name={school.name} url={school.logo?.formats?.thumbnail?.url ?? school.logo?.url} size={72} />
      <View className="flex-1 gap-1">
        <Text variant="h3">{school.name}</Text>
        {!!school.affiliation && <Text className="font-medium">{school.affiliation.name}</Text>}
        {!!where && <Text variant="muted">{where}</Text>}
        <Text variant="muted" className={stale ? 'text-amber-700' : undefined}>
          {verified ? `Schedule verified ${formatDate(verified)}${stale ? ' (may be out of date)' : ''}` : 'Schedule not verified yet'}
        </Text>
      </View>
    </View>
  );
}
