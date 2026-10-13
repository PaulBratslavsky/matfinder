import { SearchX } from 'lucide-react-native';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

/** No school matches the search and filters. */
export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <View className="items-center gap-3 rounded-xl border border-border bg-card px-6 py-8">
      <Icon as={SearchX} className="size-8 text-muted-foreground" />
      <View className="items-center gap-1">
        <Text className="font-semibold">No schools match</Text>
        <Text variant="muted" className="text-center">
          Try another search, or turn off a filter: they all have to match.
        </Text>
      </View>
      <Button variant="outline" onPress={onClear}>
        <Text>Clear search and filters</Text>
      </Button>
    </View>
  );
}
