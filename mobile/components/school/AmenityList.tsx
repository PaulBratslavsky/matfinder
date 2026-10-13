import { Check } from 'lucide-react-native';
import { View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { AmenityKey, SchoolPage } from '@/lib/api/schools';
import { EmptyLine } from './Section';

const LABELS: Record<AmenityKey, string> = {
  showers: 'Showers',
  changingRooms: 'Changing rooms',
  parking: 'Parking',
  giRental: 'Gi rental',
  proShop: 'Pro shop',
  kidsArea: 'Kids area',
  airConditioning: 'Air conditioning',
};

export function AmenityList({ amenities }: { amenities: SchoolPage['amenities'] }) {
  const available = (Object.keys(LABELS) as AmenityKey[]).filter((k) => amenities?.[k]);
  if (!available.length) return <EmptyLine>No amenities listed.</EmptyLine>;
  return (
    <View className="flex-row flex-wrap gap-x-6 gap-y-2">
      {available.map((k) => (
        <View key={k} className="flex-row items-center gap-1.5">
          <Icon as={Check} className="size-4 text-green-600" />
          <Text className="text-sm">{LABELS[k]}</Text>
        </View>
      ))}
    </View>
  );
}
