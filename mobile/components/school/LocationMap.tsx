import Mapbox, { Camera, MapView, PointAnnotation } from '@rnmapbox/maps';
import { View } from 'react-native';
import { MAPBOX_TOKEN, PIN_COLOR, hasMapboxToken } from '@/components/map/SchoolMap.types';
import type { LocationMapProps } from './LocationMap.types';

Mapbox.setAccessToken(MAPBOX_TOKEN);

/** A small, non-interactive map of the school (native). Nothing without a Mapbox token. */
export default function LocationMap({ latitude, longitude, zoom = 14 }: LocationMapProps) {
  if (!hasMapboxToken) return null;
  return (
    <View className="h-48 overflow-hidden rounded-xl border border-border">
      <MapView style={{ flex: 1 }} scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false} scaleBarEnabled={false}>
        <Camera defaultSettings={{ centerCoordinate: [longitude, latitude], zoomLevel: zoom }} />
        <PointAnnotation id="school" coordinate={[longitude, latitude]}>
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: PIN_COLOR, borderWidth: 2, borderColor: '#fff' }} />
        </PointAnnotation>
      </MapView>
    </View>
  );
}
