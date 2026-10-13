import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Progress } from '@/components/kit';
import { formatDuration, type SessionState } from '@/lib/explore';
import { classTypeLabel, formatTime, toMinutes } from '@/lib/time';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

/**
 * A school's day in one line, in the city's time: "ON NOW until 5:30 pm · 45 min left" with a progress bar,
 * "Fundamentals · 6:00 pm · in 1 h 15 min", or "No more classes today".
 */
export function SessionLine({ state }: { state: SessionState }) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (state.kind === 'live') {
    const length = toMinutes(state.session.end) - toMinutes(state.session.start);
    return (
      <View style={styles.live}>
        <View style={styles.row}>
          <View style={styles.liveDot} />
          <Text style={styles.onNow}>On now</Text>
          <Text style={styles.meta} numberOfLines={1}>
            until {formatTime(state.session.end)} · {formatDuration(state.minutesLeft)} left
          </Text>
        </View>
        <Progress value={state.progress} label={`${length - state.minutesLeft} of ${length} minutes done`} />
      </View>
    );
  }
  if (state.kind === 'upcoming') {
    return (
      <View style={styles.row}>
        <Ionicons name="time-outline" size={16} color={colors.text} />
        <Text style={styles.next} numberOfLines={1}>
          {classTypeLabel(state.session.classType)} · {formatTime(state.session.start)}
          <Text style={styles.meta}> · in {formatDuration(state.minutesUntil)}</Text>
        </Text>
      </View>
    );
  }
  return <Text style={styles.none}>{state.kind === 'done' ? 'No more classes today' : 'No classes today'}</Text>;
}

const useStyles = makeStyles((t) => ({
  live: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.live, boxShadow: `0 0 0 3px ${t.colors.liveGlow}` },
  onNow: { ...t.type.heavy, fontSize: 16, letterSpacing: 0.8, color: t.colors.liveText, marginLeft: 2 },
  meta: { ...t.type.bodyMedium, fontSize: 14, color: t.colors.textSecondary, flexShrink: 1 },
  next: { ...t.type.bodySemibold, fontSize: 15, color: t.colors.text, flexShrink: 1 },
  none: { ...t.type.body, fontSize: 14, color: t.colors.textDim },
}));
