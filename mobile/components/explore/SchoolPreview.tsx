import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ActionButton, Card, Chip, Label, Progress, RankBar } from '@/components/kit';
import { useSession } from '@/hooks/useSession';
import type { DirectorySchool } from '@/lib/api/schools';
import { dropInLabel, formatDistance, formatDuration, sessionsLeftToday, type SessionState } from '@/lib/explore';
import { classTypeLabel, formatTime, styleLabel, toMinutes, type CityNow } from '@/lib/time';
import { sourceLine, verifiedLine } from '@/lib/verified';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { NoticeBanner } from '../school/NoticeBanner';

/** The next class today, big: "Open mat · 7:00 pm", when it ends and how long until it starts (or is left). */
function NextSessionCard({ school, state, now }: { school: DirectorySchool; state: SessionState; now: CityNow }) {
  const styles = useStyles();
  const left = sessionsLeftToday(school.todaySessions, now);
  if (state.kind === 'done' || state.kind === 'none') {
    return (
      <Card style={styles.next}>
        <Label>Today</Label>
        <Text style={styles.nextTitle}>{state.kind === 'done' ? 'No more classes today' : 'No classes today'}</Text>
      </Card>
    );
  }
  const s = state.session;
  const live = state.kind === 'live';
  const length = toMinutes(s.end) - toMinutes(s.start);
  return (
    <Card style={styles.next}>
      <Label tone={live ? 'live' : 'secondary'} size={12}>
        {live ? 'On now' : 'Next session · today'}
      </Label>
      <Text style={styles.nextTitle}>
        {classTypeLabel(s.classType)}
        {live ? '' : ` · ${formatTime(s.start)}`}
      </Text>
      <Text style={styles.nextMeta}>
        {styleLabel(s.style)} · until {formatTime(s.end)} ·{' '}
        <Text style={styles.nextStrong}>{live ? `${formatDuration(state.minutesLeft)} left` : `starts in ${formatDuration(state.minutesUntil)}`}</Text>
      </Text>
      {live && <Progress value={state.progress} label={`${length - state.minutesLeft} of ${length} minutes done`} />}
      <View style={styles.leftRow}>
        <RankBar stripes={left} />
        <Label size={13}>{`${left} left today`}</Label>
      </View>
    </Card>
  );
}

/**
 * The tapped school in the bottom sheet: "can I train here tonight, and what does it cost?", plus View gym,
 * which opens the account-only school page.
 */
export function SchoolPreview({
  school,
  state,
  now,
  distanceMiles,
  onBack,
}: {
  school: DirectorySchool;
  state: SessionState;
  now: CityNow;
  distanceMiles: number | null;
  onBack: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const session = useSession();
  const kicker = [school.neighborhood, distanceMiles != null ? formatDistance(distanceMiles) : null].filter(Boolean).join(' · ');
  const fee = dropInLabel(school);
  const verified = verifiedLine(school.lastVerifiedAt, now.localDate);
  return (
    <ScrollView accessibilityLabel={`${school.name} preview`} style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Pressable accessibilityRole="button" accessibilityLabel="All gyms" onPress={onBack} hitSlop={8} style={styles.back}>
        <Ionicons name="chevron-back" size={18} color={colors.text} />
        <Text style={styles.backText}>All gyms</Text>
      </Pressable>

      <View style={styles.head}>
        {!!kicker && <Label tone="red">{kicker}</Label>}
        <Text role="heading" style={styles.name}>
          {school.name}
        </Text>
        {!!school.affiliation && <Text style={styles.team}>{school.affiliation}</Text>}
      </View>
      <NoticeBanner notice={school.notice} />

      <NextSessionCard school={school} state={state} now={now} />

      <View style={styles.chips}>
        {school.claimed && <Chip label="Claimed" variant="live" icon="checkmark-circle" />}
        {school.visitorsWelcome === true && <Chip label="Visitors welcome" variant="solid" />}
        {school.visitorsWelcome === false && <Chip label="No drop-ins" icon="lock-closed-outline" />}
        {school.freeTrial && <Chip label="Free first class" />}
        {!!fee && <Chip label={fee} />}
        {school.styles.map((s) => (
          <Chip key={s} label={styleLabel(s)} />
        ))}
      </View>
      <View style={styles.trust}>
        <Text style={[styles.trustText, verified.stale && styles.stale]}>{verified.text}</Text>
        <Text style={styles.trustText}>{sourceLine(school.addedFromWeb)}</Text>
      </View>

      <Link href={{ pathname: '/schools/[slug]', params: { slug: school.slug } }} asChild>
        <ActionButton label="View gym" size="lg" style={styles.view} />
      </Link>
      {!session.data?.user && (
        <View style={styles.lock}>
          <Ionicons name="lock-closed-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.lockText}>Full schedule, coaches and contact with a free account</Text>
        </View>
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1 },
  container: { paddingHorizontal: t.layout.gutter, paddingBottom: 24 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', height: 40, marginLeft: -6, paddingHorizontal: 6 },
  backText: { ...t.type.label, fontSize: 15, color: t.colors.text },
  head: { gap: 4 },
  name: { ...t.type.display, fontSize: 32, lineHeight: 34, color: t.colors.text },
  team: { ...t.type.body, fontSize: 15, color: t.colors.textSecondary },
  next: { marginTop: 12, gap: 3, paddingVertical: 12 },
  nextTitle: { ...t.type.heavy, fontSize: 24, lineHeight: 26, color: t.colors.text },
  nextMeta: { ...t.type.body, fontSize: 14, color: t.colors.textSecondary },
  nextStrong: { ...t.type.bodySemibold, color: t.colors.text },
  leftRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  trust: { gap: 2, marginTop: 10 },
  trustText: { ...t.type.body, fontSize: 13, color: t.colors.textSecondary },
  stale: { color: t.colors.warning },
  view: { marginTop: 14 },
  lock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  lockText: { ...t.type.body, fontSize: 13, color: t.colors.textSecondary },
}));
