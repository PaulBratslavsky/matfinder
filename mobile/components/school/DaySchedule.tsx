import { Fragment } from 'react';
import { Text, View } from 'react-native';
import { Card, Label } from '@/components/kit';
import { classTypeLabel, formatTime, styleLabel, toMinutes, type CityNow } from '@/lib/time';
import { DAY_NAMES, dayList, dayShort, type NextClass, type ScheduledSession } from '@/lib/week';
import { makeStyles } from '@/theme/ThemeProvider';
import { formatRange } from './NextClassCard';

/** Today's classes as a card: finished ones dimmed ("Done"), the next one tinted ("Next"), a running one "On now". */
export function TodaySchedule({ sessions, now, next }: { sessions: ScheduledSession[]; now: CityNow; next: NextClass | null }) {
  const styles = useStyles();
  return (
    <>
      <Label size={14} style={styles.heading}>{`Today · ${DAY_NAMES[now.weekday]}`}</Label>
      {sessions.length === 0 ? (
        <Text style={styles.none}>No classes today.</Text>
      ) : (
        <Card padded={false} style={styles.card}>
          {sessions.map((s, i) => {
            const done = toMinutes(s.end) <= now.minutes;
            const isNext = next?.daysAhead === 0 && next.session === s;
            const [start, end] = [formatTime(s.start), formatTime(s.end)];
            return (
              <Fragment key={`${s.start}-${i}`}>
                {i > 0 && <View style={styles.divider} />}
                <View style={[styles.row, isNext && styles.rowNext]}>
                  <Text style={[styles.time, done && styles.dim]}>
                    {start.slice(0, -3)}
                    {'\n'}
                    {end.slice(0, -3)} {end.slice(-2).toUpperCase()}
                  </Text>
                  <View style={styles.what}>
                    <Text style={[styles.class, done && styles.dim]}>{classTypeLabel(s.classType)}</Text>
                    <Text style={[styles.meta, done && styles.dim]}>{[styleLabel(s.style), s.notes].filter(Boolean).join(' · ')}</Text>
                  </View>
                  {done ? (
                    <Label tone="dim">Done</Label>
                  ) : isNext ? (
                    <View style={[styles.badge, next.onNow && styles.badgeLive]}>
                      <Text style={styles.badgeText}>{next.onNow ? 'On now' : 'Next'}</Text>
                    </View>
                  ) : null}
                </View>
              </Fragment>
            );
          })}
        </Card>
      )}
    </>
  );
}

/** The six days after today, one row per class; days without classes on one line at the end. */
export function RestOfWeek({ days, emptyDays }: { days: { day: ScheduledSession['day']; sessions: ScheduledSession[] }[]; emptyDays: ScheduledSession['day'][] }) {
  const styles = useStyles();
  return (
    <>
      <Label size={14} style={styles.headingRest}>
        Rest of the week
      </Label>
      <View>
        {days.flatMap(({ day, sessions }) =>
          sessions.map((s, i) => (
            <View key={`${day}-${s.start}-${i}`} style={styles.weekRow}>
              <Text style={styles.weekDay}>{i === 0 ? dayShort(day) : ''}</Text>
              <View style={styles.what}>
                <Text style={styles.weekClass}>
                  {classTypeLabel(s.classType)} · {styleLabel(s.style)}
                </Text>
                {!!s.notes && <Text style={styles.weekNote}>{s.notes}</Text>}
              </View>
              <Text style={styles.weekTime}>{formatRange(s.start, s.end)}</Text>
            </View>
          )),
        )}
        {emptyDays.length > 0 && (
          <View style={[styles.weekRow, styles.weekRowLast]}>
            {/* Initials only fit for one or two days ("F · S"). */}
            <Text style={[styles.weekDay, styles.dim]}>{emptyDays.length <= 2 ? emptyDays.map((d) => DAY_NAMES[d][0]).join(' · ') : '–'}</Text>
            <Text style={[styles.weekNote, styles.what]}>No classes {dayList(emptyDays)}</Text>
          </View>
        )}
      </View>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  heading: { marginTop: 20, marginBottom: 8 },
  headingRest: { marginTop: 18, marginBottom: 4 },
  none: { ...t.type.body, fontSize: 15, color: t.colors.textSecondary },
  card: { overflow: 'hidden' },
  divider: { height: 1, backgroundColor: t.colors.separator },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowNext: { backgroundColor: t.colors.redTint },
  time: { ...t.type.label, letterSpacing: 0, width: 64, fontSize: 17, lineHeight: 19, color: t.colors.text },
  what: { flex: 1, gap: 2 },
  class: { ...t.type.label, letterSpacing: 0, fontSize: 20, lineHeight: 22, color: t.colors.text },
  meta: { ...t.type.body, fontSize: 14, color: t.colors.textSecondary },
  dim: { color: t.colors.textDim },
  badge: { height: 24, paddingHorizontal: 8, borderRadius: t.radii.chip, backgroundColor: t.colors.redFill, justifyContent: 'center' },
  badgeLive: { backgroundColor: t.colors.liveFill },
  badgeText: { ...t.type.heavy, fontSize: 13, letterSpacing: 1, color: '#FFFFFF' },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderBottomWidth: 1, borderBottomColor: t.colors.separator, paddingVertical: 6 },
  weekRowLast: { borderBottomWidth: 0, minHeight: 46 },
  weekDay: { fontFamily: t.fonts.heavy, textTransform: 'uppercase', width: 40, fontSize: 17, color: t.colors.text },
  weekClass: { ...t.type.bodySemibold, fontSize: 15, color: t.colors.text },
  weekNote: { ...t.type.body, fontSize: 13, color: t.colors.textSecondary },
  weekTime: { ...t.type.body, fontSize: 15, color: t.colors.textSecondary },
}));
