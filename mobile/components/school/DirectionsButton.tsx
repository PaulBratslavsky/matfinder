import { Navigation } from 'lucide-react-native';
import { Linking } from 'react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { directionsUrl } from '@/lib/geo';

/** Hands off to Apple Maps on iOS, Google Maps elsewhere. */
export function DirectionsButton({ latitude, longitude, name }: { latitude: number; longitude: number; name: string }) {
  return (
    <Button onPress={() => Linking.openURL(directionsUrl(latitude, longitude, name))}>
      <Icon as={Navigation} className="size-4 text-primary-foreground" />
      <Text>Directions</Text>
    </Button>
  );
}
