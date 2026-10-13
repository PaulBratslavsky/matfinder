import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DirectorySchool } from '@/lib/api/schools';
import { mediaUrl } from '@/lib/media';
import type { CityNow } from '@/lib/time';
import { IOS } from './ios';
import { NextSession } from './NextSession';

export function formatDistance(miles: number): string {
  return miles < 0.1 ? `${Math.round(miles * 5280)} ft` : `${miles.toFixed(1)} mi`;
}

/** metravel-explore's location card, for a school: icon (or logo), name, next session, area · team, distance. */
export function SchoolCard({
  school,
  now,
  distanceMiles,
  onPress,
}: {
  school: DirectorySchool;
  now: CityNow;
  distanceMiles: number | null;
  onPress: () => void;
}) {
  const logo = mediaUrl(school.logo?.url);
  const subtitle = [school.neighborhood, school.affiliation].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={school.name}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}>
      <View style={styles.icon}>
        {logo ? (
          <Image source={{ uri: logo }} style={styles.logo} contentFit="cover" />
        ) : (
          <Ionicons name="location" size={20} color={IOS.blue} />
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {school.name}
        </Text>
        <View style={styles.session}>
          <NextSession sessions={school.todaySessions} now={now} />
        </View>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {distanceMiles != null && (
        <View style={styles.distance}>
          <Text style={styles.distanceText}>{formatDistance(distanceMiles)}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: IOS.fill, borderRadius: 12, padding: 12, marginBottom: 8 },
  cardPressed: { backgroundColor: IOS.fillPressed },
  icon: { width: 40, height: 40, borderRadius: 10, backgroundColor: IOS.blueTint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo: { width: 40, height: 40 },
  content: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '500', color: IOS.label },
  session: { marginTop: 3 },
  subtitle: { fontSize: 13, color: IOS.secondaryLabel, marginTop: 2 },
  distance: { marginLeft: 8 },
  distanceText: { fontSize: 13, fontWeight: '500', color: IOS.blue },
});
