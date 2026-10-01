import { LocateFixed } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

export function RecenterButton({ onPress }: { onPress: () => void }) {
  return (
    <Button variant="outline" size="icon" accessibilityLabel="Recenter map" onPress={onPress} className="rounded-full bg-background shadow-md">
      <Icon as={LocateFixed} className="size-5" />
    </Button>
  );
}
