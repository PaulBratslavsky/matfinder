import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { ActionButton, Card, Label, Progress, RankBar } from '@/components/kit';
import type { SchoolPage } from '@/lib/api/schools';
import { formatDuration, sessionsLeftToday } from '@/lib/explore';
import { directionsUrl } from '@/lib/geo';
import { classTypeLabel, formatTime, styleLabel, toMinutes, type CityNow } from '@/lib/time';
import { addDays, calendarIcs, calendarUrl, DAY_NAMES, dayShort, type NextClass } from '@/lib/week';
import { makeStyles } from '@/theme/ThemeProvider';

/** `19:00`–`20:30` → `7:00 – 8:30 pm`; `11:00`–`12:30` → `11:00 am – 12:30 pm`. */
export function formatRange(start: string, end: string): string {
  const [a, b] = [formatTime(start), formatTime(end)];
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`;
}

/**
 * The next class, big, with a countdown: today's ("Starts in 2 h 15 min"), the one on now ("45 min left"), or the
 * first on a later day. Directions and Add to calendar (a Google Calendar link in the city's time zone).
 */
export function NextClassCard({ school, next, now }: { school: SchoolPage; next: NextClass | null; now: CityNow | null }) {
  const styles = useStyles();
  const directions = school.location && (
    <ActionButton
      label="Directions"
      icon="navigate"
      compact
      style={styles.action}
      onPress={() => Linking.openURL(directionsUrl(school.location!.latitude, school.location!.longitude, school.name))}
    />
  );
  if (!next || !now) {
    return (
      <Card style={styles.card}>
        <Label>Next session</Label>
        <Text style={styles.title}>No classes listed</Text>
        <Text style={styles.meta}>Contact the gym for its schedule.</Text>
        {directions && <View style={styles.actions}>{directions}</View>}
      </Card>
    );
  }
  const s = next.session;
  const today = next.daysAhead === 0;
  const left = sessionsLeftToday(school.todaySessions, now);
  const label = next.onNow ? 'On now' : `Next session · ${today ? 'today' : next.daysAhead === 1 ? 'tomorrow' : DAY_NAMES[s.day]}`;
  const length = toMinutes(s.end) - toMinutes(s.start);
  const minutesLeft = toMinutes(s.end) - now.minutes;
  const event = {
    title: `${classTypeLabel(s.classType)} at ${school.name}`,
    date: addDays(now.localDate, next.daysAhead),
    start: s.start,
    end: s.end,
    timeZone: school.city?.timezone ?? 'UTC',
    location: school.location?.address,
    details: [styleLabel(s.style), s.notes].filter(Boolean).join(' · '),
  };
  const calendar = calendarUrl(event);
  const downloadIcs = () => {
    const ics = calendarIcs({ ...event, uid: `${school.slug}-${event.date}-${s.start.replace(':', '')}` });
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${school.slug}-${event.date}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <Card style={styles.card}>
      <Label tone={next.onNow ? 'live' : 'secondary'}>{label}</Label>
      <Text style={styles.title}>{classTypeLabel(s.classType)}</Text>
      <Text style={styles.time}>
        {styleLabel(s.style)} · {formatRange(s.start, s.end)}
      </Text>
      {!!s.notes && <Text style={styles.meta}>Gym note: {s.notes}</Text>}
      <View style={styles.countdown}>
        <Label size={14}>{next.onNow ? 'Ends in' : today ? 'Starts in' : 'Starts'}</Label>
        <Text style={[styles.big, next.onNow && styles.bigLive]}>
          {next.onNow ? formatDuration(minutesLeft) : today ? formatDuration(toMinutes(s.start) - now.minutes) : `${dayShort(s.day)} ${formatTime(s.start)}`}
        </Text>
      </View>
      {next.onNow && <Progress value={(length - minutesLeft) / length} label={`${length - minutesLeft} of ${length} minutes done`} />}
      {left > 0 && (
        <View style={styles.left}>
          <RankBar stripes={left} />
          <Label>{`${left} session${left === 1 ? '' : 's'} left today`}</Label>
        </View>
      )}
      <View style={styles.actions}>
        {directions}
        <ActionButton label="Add to calendar" icon="calendar-outline" variant="outline" compact style={styles.action} onPress={() => Linking.openURL(calendar)} />
      </View>
      {Platform.OS === 'web' && (
        <Pressable accessibilityRole="button" accessibilityLabel="Download .ics" onPress={downloadIcs} style={styles.ics}>
          <Text style={styles.icsText}>
            Apple Calendar or Outlook? <Text style={styles.icsLink}>Download .ics</Text>
          </Text>
        </Pressable>
      )}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  card: { marginTop: 18, padding: 16, borderRadius: t.radii.section },
  title: { ...t.type.display, fontSize: 40, lineHeight: 42, color: t.colors.text, marginTop: 4 },
  time: { ...t.type.bodySemibold, fontSize: 16, color: t.colors.text, marginTop: 6 },
  meta: { ...t.type.body, fontSize: 14, color: t.colors.textSecondary, marginTop: 2 },
  countdown: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 12 },
  big: { ...t.type.heavy, fontSize: 32, lineHeight: 34, color: t.colors.redText },
  bigLive: { color: t.colors.liveText },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  action: { flex: 1 },
  ics: { marginTop: 10, alignSelf: 'flex-start' },
  icsText: { ...t.type.body, fontSize: 13, color: t.colors.textSecondary },
  icsLink: { ...t.type.bodySemibold, color: t.colors.redText, textDecorationLine: 'underline' },
}));
