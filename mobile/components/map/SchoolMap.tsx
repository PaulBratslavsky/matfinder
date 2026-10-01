import Mapbox, { Camera, CircleLayer, LocationPuck, MapView, ShapeSource, SymbolLayer } from '@rnmapbox/maps';
import { useEffect, useMemo, useRef, type ComponentProps } from 'react';
import { CLUSTER, MAPBOX_TOKEN, PIN_COLOR, SELECTED_COLOR, toFeatureCollection, type SchoolMapProps } from './SchoolMap.types';

Mapbox.setAccessToken(MAPBOX_TOKEN);

type OnPressEvent = Parameters<NonNullable<ComponentProps<typeof ShapeSource>['onPress']>>[0];

/** Native map: @rnmapbox/maps (needs a development build, not Expo Go), clustered school pins. */
export default function SchoolMap({ schools, center, zoom, selectedSlug, onSelect, userLocation, recenterKey }: SchoolMapProps) {
  const camera = useRef<Camera>(null);
  const source = useRef<ShapeSource>(null);
  const shape = useMemo(() => toFeatureCollection(schools, selectedSlug), [schools, selectedSlug]);

  useEffect(() => {
    if (recenterKey > 0) camera.current?.setCamera({ centerCoordinate: [center.longitude, center.latitude], zoomLevel: zoom, animationDuration: 800 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey]);

  useEffect(() => {
    const s = schools.find((x) => x.slug === selectedSlug);
    if (s) camera.current?.setCamera({ centerCoordinate: [s.longitude, s.latitude], animationDuration: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug]);

  const onPress = async (e: OnPressEvent) => {
    const feature = e.features[0];
    if (!feature) return;
    if (feature.properties?.cluster) {
      const z = await source.current?.getClusterExpansionZoom(feature as GeoJSON.Feature<GeoJSON.Point>);
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates;
      camera.current?.setCamera({ centerCoordinate: coordinates, zoomLevel: z, animationDuration: 500 });
      return;
    }
    onSelect(String(feature.properties?.slug));
  };

  return (
    <MapView style={{ flex: 1 }} styleURL={Mapbox.StyleURL.Street} scaleBarEnabled={false} logoPosition={{ bottom: 8, left: 8 }}>
      <Camera ref={camera} defaultSettings={{ centerCoordinate: [center.longitude, center.latitude], zoomLevel: zoom }} />
      {userLocation && <LocationPuck />}
      <ShapeSource id="schools" ref={source} shape={shape} cluster clusterRadius={CLUSTER.radius} clusterMaxZoomLevel={CLUSTER.maxZoom} onPress={onPress}>
        <CircleLayer
          id="clusters"
          filter={['has', 'point_count']}
          style={{
            circleColor: PIN_COLOR,
            circleOpacity: 0.9,
            circleRadius: ['step', ['get', 'point_count'], 16, 5, 20, 15, 26],
            circleStrokeWidth: 2,
            circleStrokeColor: '#ffffff',
          }}
        />
        <SymbolLayer
          id="cluster-count"
          filter={['has', 'point_count']}
          style={{ textField: ['get', 'point_count_abbreviated'], textSize: 13, textColor: '#ffffff', textAllowOverlap: true }}
        />
        <CircleLayer
          id="schools"
          filter={['!', ['has', 'point_count']]}
          style={{
            circleColor: ['case', ['get', 'selected'], SELECTED_COLOR, PIN_COLOR],
            circleRadius: ['case', ['get', 'selected'], 10, 8],
            circleStrokeWidth: 2,
            circleStrokeColor: '#ffffff',
          }}
        />
      </ShapeSource>
    </MapView>
  );
}
