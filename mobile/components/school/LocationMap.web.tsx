import 'mapbox-gl/dist/mapbox-gl.css';
import { View } from 'react-native';
import Map, { Marker } from 'react-map-gl/mapbox';
import { MAPBOX_TOKEN, PIN_COLOR, hasMapboxToken } from '@/components/map/SchoolMap.types';
import type { LocationMapProps } from './LocationMap.types';

/** A small, non-interactive map of the school (web). Nothing without a Mapbox token. */
export default function LocationMap({ latitude, longitude, zoom = 14 }: LocationMapProps) {
  if (!hasMapboxToken) return null;
  return (
    <View className="h-48 overflow-hidden rounded-xl border border-border">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ latitude, longitude, zoom }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        interactive={false}
        attributionControl={false}>
        <Marker latitude={latitude} longitude={longitude} color={PIN_COLOR} />
      </Map>
    </View>
  );
}
