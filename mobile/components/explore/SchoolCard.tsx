import { Pressable, Text, View } from 'react-native';
import { Chip, Label, RankBar } from '@/components/kit';
import type { DirectorySchool } from '@/lib/api/schools';
import { distanceParts, dropInLabel, sessionsLeftToday, type SessionState } from '@/lib/explore';
import type { CityNow } from '@/lib/time';
import { makeStyles } from '@/theme/ThemeProvider';
import { SessionLine } from './SessionLine';

/** The deciding fact for a visitor: members only, the drop-in price, or just "visitors welcome"; nothing if the gym hasn't said. */
export function visitChip(s: Pick<DirectorySchool, 'visitorsWelcome' | 'dropInFee' | 'currency'>) {
  if (s.visitorsWelcome === false) return <Chip label="Members only" icon="lock-closed-outline" />;
  const fee = dropInLabel(s);
  if (s.visitorsWelcome) return <Chip label={fee ?? 'Visitors welcome'} />;
  return fee ? <Chip label={fee} /> : null;
}

/**
 * A school in the Explore list: name and distance, what's on today (with a progress bar when it's on now),
 * area · team, and a rank bar with one stripe per class left today.
 */
export function SchoolCard({
  school,
  state,
  now,
  distanceMiles,
  onPress,
}: {
  school: DirectorySchool;
  state: SessionState;
  now: CityNow;
  distanceMiles: number | null;
  onPress: () => void;
}) {
  const styles = useStyles();
  const subtitle = [school.neighborhood, school.affiliation].filter(Boolean).join(' · ');
  const left = sessionsLeftToday(school.todaySessions, now);
  const distance = distanceMiles != null ? distanceParts(distanceMiles) : null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={school.name} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <Text style={styles.name} numberOfLines={1}>
          {school.name}
        </Text>
        {distance && (
          <Text style={styles.distance}>
            {distance.value}
            <Text style={styles.unit}> {distance.unit}</Text>
          </Text>
        )}
      </View>
      <SessionLine state={state} />
      {!!subtitle && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
      <View style={styles.bottom}>
        {left > 0 && <RankBar stripes={left} />}
        <View style={styles.grow}>{left > 0 && <Label>{`${left} left today`}</Label>}</View>
        {visitChip(school)}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: 6,
    padding: 14,
    borderRadius: t.radii.card,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.surfaceBorder,
    boxShadow: `0 1px 2px ${t.colors.cardShadow}`,
  },
  pressed: { opacity: 0.85 },
  top: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  name: { ...t.type.label, letterSpacing: 0, flex: 1, minWidth: 0, fontSize: 22, lineHeight: 24, color: t.colors.text },
  distance: { fontFamily: t.fonts.heavy, fontSize: 24, lineHeight: 26, color: t.colors.text },
  unit: { ...t.type.label, fontSize: 13, color: t.colors.textSecondary },
  subtitle: { ...t.type.body, fontSize: 14, color: t.colors.textSecondary },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  grow: { flex: 1 },
}));
