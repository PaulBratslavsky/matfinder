import { Linking, Text, View } from 'react-native';
import { LocationMap } from '@/components/LocationMap';
import { ActionButton } from '@/components/kit';
import type { SchoolPage } from '@/lib/api/schools';
import { formatDistance } from '@/lib/explore';
import { directionsUrl } from '@/lib/geo';
import { hasMapboxToken } from '@/lib/mapbox';
import { makeStyles } from '@/theme/ThemeProvider';

/** A small static map of the gym, its address and Directions (Apple Maps on iOS, Google Maps elsewhere). */
export function GetThere({ name, location, distanceMiles }: { name: string; location: NonNullable<SchoolPage['location']>; distanceMiles: number | null }) {
  const styles = useStyles();
  return (
    <View>
      {hasMapboxToken && (
        <View style={styles.map} accessibilityLabel={`Map showing ${name}`}>
          <LocationMap location={{ longitude: location.longitude, latitude: location.latitude, zoom: 14, pitch: 0, bearing: 0 }} showMarker interactive={false} />
        </View>
      )}
      {!!location.address && <Text style={styles.address}>{location.address}</Text>}
      {distanceMiles != null && <Text style={styles.distance}>{formatDistance(distanceMiles)} from you</Text>}
      <ActionButton
        label="Directions"
        icon="navigate-outline"
        variant="outline"
        style={styles.button}
        onPress={() => Linking.openURL(directionsUrl(location.latitude, location.longitude, name))}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  map: { height: 160, borderRadius: t.radii.card, overflow: 'hidden', borderWidth: 1, borderColor: t.colors.surfaceBorder },
  address: { ...t.type.body, fontSize: 15, color: t.colors.text, marginTop: 10 },
  distance: { ...t.type.body, fontSize: 15, color: t.colors.textSecondary, marginTop: 2 },
  button: { marginTop: 12 },
}));
