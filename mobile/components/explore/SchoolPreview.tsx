import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DirectorySchool } from '@/lib/api/schools';
import type { CityNow } from '@/lib/time';
import { IOS } from './ios';
import { NextSession } from './NextSession';
import { formatDistance } from './SchoolCard';

/** "Drop-in $25", "Free drop-in", or null when the school hasn't published a fee. */
export function dropInLabel(s: Pick<DirectorySchool, 'dropInFee' | 'currency'>): string | null {
  if (s.dropInFee == null) return null;
  if (s.dropInFee === 0) return 'Free drop-in';
  const amount = Number.isInteger(s.dropInFee) ? String(s.dropInFee) : s.dropInFee.toFixed(2);
  return `Drop-in ${s.currency === 'USD' ? '$' : `${s.currency} `}${amount}`;
}

/**
 * The tapped school, shown in the bottom sheet: "can I train here tonight, and what does it cost?" plus
 * View school, which opens the account-only school page.
 */
export function SchoolPreview({
  school,
  now,
  distanceMiles,
  onBack,
}: {
  school: DirectorySchool;
  now: CityNow;
  distanceMiles: number | null;
  onBack: () => void;
}) {
  const subtitle = [school.affiliation, school.neighborhood].filter(Boolean).join(' · ');
  const fee = dropInLabel(school);
  const pills = [
    { label: school.visitorsWelcome ? 'Visitors welcome' : 'Members only', tone: school.visitorsWelcome ? 'green' : 'plain' },
    ...(fee ? [{ label: fee, tone: 'plain' }] : []),
    ...school.styles.map((s) => ({ label: s === 'gi' ? 'Gi' : 'No-Gi', tone: 'plain' })),
  ];
  return (
    <View accessibilityLabel={`${school.name} preview`} style={styles.container}>
      <View style={styles.handle} />
      <Pressable accessibilityRole="button" accessibilityLabel="All schools" onPress={onBack} hitSlop={8} style={styles.back}>
        <Ionicons name="chevron-back" size={18} color={IOS.blue} />
        <Text style={styles.backText}>All schools</Text>
      </Pressable>

      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Text style={styles.name}>{school.name}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {distanceMiles != null && <Text style={styles.distance}>{formatDistance(distanceMiles)}</Text>}
      </View>

      <View style={styles.session}>
        <NextSession sessions={school.todaySessions} now={now} size="md" />
      </View>

      <View style={styles.pills}>
        {pills.map((p) => (
          <View key={p.label} style={[styles.pill, p.tone === 'green' && styles.pillGreen]}>
            <Text style={[styles.pillText, p.tone === 'green' && styles.pillTextGreen]}>{p.label}</Text>
          </View>
        ))}
      </View>

      <Link href={{ pathname: '/schools/[slug]', params: { slug: school.slug } }} asChild>
        {/* A plain style: Link's asChild slot doesn't forward Pressable's function style on the web. */}
        <Pressable accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonText}>View school</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 24 },
  handle: { width: 36, height: 5, borderRadius: 3, backgroundColor: IOS.fillPressed, alignSelf: 'center', marginBottom: 12 },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 10 },
  backText: { fontSize: 15, color: IOS.blue },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleText: { flex: 1 },
  name: { fontSize: 20, fontWeight: '600', color: IOS.label },
  subtitle: { fontSize: 13, color: IOS.secondaryLabel, marginTop: 2 },
  distance: { fontSize: 13, fontWeight: '500', color: IOS.blue, marginTop: 4 },
  session: { marginTop: 12 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  pill: { backgroundColor: IOS.fill, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  pillGreen: { backgroundColor: 'rgba(52, 199, 89, 0.15)' },
  pillText: { fontSize: 13, color: IOS.label },
  pillTextGreen: { color: '#248A3D', fontWeight: '500' },
  button: { marginTop: 16, backgroundColor: IOS.blue, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonText: { fontSize: 17, fontWeight: '600', color: IOS.white },
});
