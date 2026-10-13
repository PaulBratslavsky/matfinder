import { Image } from 'expo-image';
import { View } from 'react-native';
import { SchoolLogo } from '@/components/explore/SchoolLogo';
import { Text } from '@/components/ui/text';
import type { BeltRank, SchoolPage } from '@/lib/api/schools';
import { mediaUrl } from '@/lib/media';
import { EmptyLine } from './Section';

/** Belt chip colors; coral belts show both colors. */
const BELTS: Record<BeltRank, { label: string; colors: string[] }> = {
  white: { label: 'White belt', colors: ['#f4f4f0'] },
  blue: { label: 'Blue belt', colors: ['#1d5cc4'] },
  purple: { label: 'Purple belt', colors: ['#5b3fa0'] },
  brown: { label: 'Brown belt', colors: ['#6b4423'] },
  black: { label: 'Black belt', colors: ['#111214'] },
  red_black: { label: 'Red and black belt', colors: ['#c62828', '#111214'] },
  red_white: { label: 'Red and white belt', colors: ['#c62828', '#f4f4f0'] },
  red: { label: 'Red belt', colors: ['#c62828'] },
};

const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 >= 11 && n % 100 <= 13 ? 0 : Math.min(n % 10, 4) % 4] ?? 'th'}`;

export function BeltChip({ rank }: { rank: BeltRank }) {
  const belt = BELTS[rank];
  return (
    <View accessibilityLabel={belt.label} className="h-3 w-10 flex-row overflow-hidden rounded-sm border border-black/20">
      {belt.colors.map((c, i) => (
        <View key={i} className="flex-1" style={{ backgroundColor: c }} />
      ))}
    </View>
  );
}

export function InstructorList({ instructors }: { instructors: SchoolPage['headInstructors'] }) {
  if (!instructors.length) return <EmptyLine>No instructors listed.</EmptyLine>;
  return (
    <View className="gap-3">
      {instructors.map((i) => {
        const photo = mediaUrl(i.photo?.formats?.thumbnail?.url ?? i.photo?.url);
        return (
          <View key={i.slug} className="flex-row gap-3">
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: 48, height: 48, borderRadius: 24 }} accessibilityLabel={i.name} />
            ) : (
              <SchoolLogo name={i.name} size={48} className="rounded-full" />
            )}
            <View className="flex-1 gap-1">
              <Text className="font-semibold">{i.name}</Text>
              <View className="flex-row items-center gap-2">
                <BeltChip rank={i.beltRank} />
                <Text variant="muted">
                  {BELTS[i.beltRank].label}
                  {i.degree ? ` · ${ordinal(i.degree)} degree` : ''}
                </Text>
              </View>
              {!!i.bio && <Text className="text-sm">{i.bio}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}
