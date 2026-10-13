import { MapPinOff } from 'lucide-react-native';
import { View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

/** Shown instead of the map when no Mapbox token is configured; the list view still works. */
export function MapUnavailable() {
  return (
    <View className="flex-row items-center gap-3 rounded-lg border border-border bg-muted px-4 py-3">
      <Icon as={MapPinOff} className="size-5 text-muted-foreground" />
      <View className="flex-1">
        <Text className="font-medium">Map unavailable</Text>
        <Text variant="muted">The map needs a Mapbox token. Every school is still in the list below.</Text>
      </View>
    </View>
  );
}
