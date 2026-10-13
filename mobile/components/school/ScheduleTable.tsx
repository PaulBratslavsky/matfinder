import { View } from 'react-native';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import type { SchoolPage, Weekday } from '@/lib/api/schools';
import { classTypeLabel, formatTime, toMinutes, type CityNow } from '@/lib/time';
import { cn } from '@/lib/utils';
import { EmptyLine } from './Section';

const DAYS: { key: Weekday; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

const STYLE = { gi: 'Gi', nogi: 'No-Gi', both: 'Gi & No-Gi' } as const;

/** The week by day, in the city's local time: today is highlighted and a running session says "On now". */
export function ScheduleTable({ schedule, now }: { schedule: SchoolPage['schedule']; now: CityNow | null }) {
  if (!schedule.length) return <EmptyLine>No classes listed yet.</EmptyLine>;
  return (
    <View className="gap-2">
      {DAYS.map(({ key, label }) => {
        const rows = schedule.filter((s) => s.day === key);
        if (!rows.length) return null;
        const today = now?.weekday === key;
        return (
          <View key={key} className={cn('gap-2 rounded-xl border border-border p-3', today && 'border-primary bg-primary/5')}>
            <View className="flex-row items-center gap-2">
              <Text className="font-semibold">{label}</Text>
              {today && (
                <Badge>
                  <Text>Today</Text>
                </Badge>
              )}
            </View>
            {rows.map((s, i) => {
              const onNow = today && !!now && toMinutes(s.start) <= now.minutes && now.minutes < toMinutes(s.end);
              const over = today && !!now && toMinutes(s.end) <= now.minutes;
              return (
                <View key={i} className={cn('flex-row items-start gap-3', over && 'opacity-50')}>
                  <Text className="w-36 text-sm tabular-nums">
                    {formatTime(s.start)} – {formatTime(s.end)}
                  </Text>
                  <View className="flex-1">
                    <View className="flex-row flex-wrap items-center gap-1.5">
                      <Text className="text-sm font-medium">{classTypeLabel(s.classType)}</Text>
                      <Text variant="muted">· {STYLE[s.style]}</Text>
                      {onNow && (
                        <Badge className="bg-green-600">
                          <Text>On now</Text>
                        </Badge>
                      )}
                    </View>
                    {!!s.notes && <Text variant="muted">{s.notes}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
