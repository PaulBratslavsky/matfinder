import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Label, RankBar } from '@/components/kit';
import type { SchoolPage } from '@/lib/api/schools';
import { formatDistance } from '@/lib/explore';
import { sourceLine, verifiedLine } from '@/lib/verified';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

/**
 * Area and distance, the gym's name, its team and when its schedule was last checked (flagged when that was more
 * than 90 days before `today`, the city-local date).
 */
export function SchoolHeader({ school, today, distanceMiles }: { school: SchoolPage; today: string | null; distanceMiles: number | null }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const kicker = [school.neighborhood ?? school.city?.name, distanceMiles != null ? formatDistance(distanceMiles) : null].filter(Boolean).join(' · ');
  const v = verifiedLine(school.lastVerifiedAt, today);
  return (
    <View style={styles.header}>
      {!!kicker && <Label tone="red" size={14}>{kicker}</Label>}
      <Text role="heading" aria-level={1} style={styles.name}>
        {school.name}
      </Text>
      {!!school.affiliation && <Text style={styles.team}>{school.affiliation.name}</Text>}
      <View style={[styles.verified, v.stale && styles.stale]}>
        <Ionicons name={v.stale ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={15} color={v.stale ? colors.warning : colors.textSecondary} />
        <Text style={[styles.verifiedText, v.stale && styles.staleText]}>{v.text}</Text>
      </View>
      <Text style={styles.source}>{sourceLine(school.addedFromWeb)}</Text>
      <RankBar stripes={3} width="100%" height={16} barWidth={64} style={styles.bar} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  header: { marginTop: 16, gap: 6 },
  name: { ...t.type.display, fontSize: 46, lineHeight: 46, color: t.colors.text },
  team: { ...t.type.body, fontSize: 16, color: t.colors.textSecondary },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  stale: { backgroundColor: t.colors.warningBg, borderRadius: t.radii.chip, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedText: { ...t.type.body, fontSize: 14, color: t.colors.textSecondary },
  staleText: { color: t.colors.warning },
  source: { ...t.type.body, fontSize: 13, color: t.colors.textSecondary },
  bar: { marginTop: 8 },
}));
