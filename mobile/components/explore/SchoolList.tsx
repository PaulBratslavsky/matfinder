import { FlatList, Pressable, View } from 'react-native';
import { Text } from '@/components/ui/text';
import type { DirectorySchool } from '@/lib/api/schools';
import { formatMiles } from '@/lib/geo';
import type { CityNow } from '@/lib/time';
import { cn } from '@/lib/utils';
import { NextSession } from './NextSession';
import { SchoolBadges } from './SchoolMeta';
import { SchoolLogo } from './SchoolLogo';

export function SchoolList({
  schools,
  now,
  distances,
  selectedSlug,
  onSelect,
  header,
}: {
  schools: DirectorySchool[];
  now: CityNow;
  distances: Map<string, number> | null;
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  header?: React.ReactElement;
}) {
  return (
    <FlatList
      data={schools}
      keyExtractor={(s) => s.slug}
      ListHeaderComponent={header}
      contentContainerClassName="gap-2 px-4 pb-40"
      renderItem={({ item }) => {
        const miles = distances?.get(item.slug);
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.name}
            onPress={() => onSelect(item.slug)}
            className={cn(
              'flex-row gap-3 rounded-xl border border-border bg-card p-3 active:bg-accent',
              item.slug === selectedSlug && 'border-primary',
            )}>
            <SchoolLogo name={item.name} url={item.logo?.url} size={44} />
            <View className="flex-1 gap-1.5">
              <View>
                <Text className="font-semibold">{item.name}</Text>
                <Text variant="muted">
                  {[item.neighborhood, item.affiliation, miles != null ? formatMiles(miles) : null].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <NextSession sessions={item.todaySessions} now={now} />
              <SchoolBadges school={item} />
            </View>
          </Pressable>
        );
      }}
    />
  );
}
