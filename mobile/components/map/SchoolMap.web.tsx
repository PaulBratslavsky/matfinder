import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import Map, { Layer, Marker, NavigationControl, Source, type MapMouseEvent, type MapRef } from 'react-map-gl/mapbox';
import type { GeoJSONSource } from 'mapbox-gl';
import { CLUSTER, MAPBOX_TOKEN, PIN_COLOR, SELECTED_COLOR, toFeatureCollection, type SchoolMapProps } from './SchoolMap.types';

/** Web map: react-map-gl + mapbox-gl, clustered school pins. */
export default function SchoolMap({ schools, center, zoom, selectedSlug, onSelect, userLocation, recenterKey }: SchoolMapProps) {
  const map = useRef<MapRef>(null);
  const data = useMemo(() => toFeatureCollection(schools, selectedSlug), [schools, selectedSlug]);

  useEffect(() => {
    if (recenterKey > 0) map.current?.flyTo({ center: [center.longitude, center.latitude], zoom, duration: 800 });
    // Only the button triggers this; the initial view comes from initialViewState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey]);

  useEffect(() => {
    const s = schools.find((x) => x.slug === selectedSlug);
    if (s) map.current?.easeTo({ center: [s.longitude, s.latitude], duration: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug]);

  const onClick = (e: MapMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) return onSelect(null);
    if (feature.layer?.id === 'clusters') {
      const source = map.current?.getSource('schools') as GeoJSONSource | undefined;
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      source?.getClusterExpansionZoom(feature.properties?.cluster_id, (err, z) => {
        if (!err && z != null) map.current?.easeTo({ center: coordinates, zoom: z, duration: 500 });
      });
      return;
    }
    onSelect(String(feature.properties?.slug));
  };

  return (
    <Map
      ref={map}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={{ longitude: center.longitude, latitude: center.latitude, zoom }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      interactiveLayerIds={['clusters', 'schools']}
      onClick={onClick}>
      <NavigationControl position="top-right" showCompass={false} />
      <Source id="schools" type="geojson" data={data} cluster clusterRadius={CLUSTER.radius} clusterMaxZoom={CLUSTER.maxZoom}>
        <Layer
          id="clusters"
          type="circle"
          filter={['has', 'point_count']}
          paint={{
            'circle-color': PIN_COLOR,
            'circle-opacity': 0.9,
            'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 15, 26],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          }}
        />
        <Layer
          id="cluster-count"
          type="symbol"
          filter={['has', 'point_count']}
          layout={{ 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13, 'text-allow-overlap': true }}
          paint={{ 'text-color': '#ffffff' }}
        />
        <Layer
          id="schools"
          type="circle"
          filter={['!', ['has', 'point_count']]}
          paint={{
            'circle-color': ['case', ['get', 'selected'], SELECTED_COLOR, PIN_COLOR],
            'circle-radius': ['case', ['get', 'selected'], 10, 8],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          }}
        />
      </Source>
      {userLocation && (
        <Marker longitude={userLocation.longitude} latitude={userLocation.latitude}>
          <View className="size-4 rounded-full border-2 border-white bg-sky-500 shadow" />
        </Marker>
      )}
    </Map>
  );
}
