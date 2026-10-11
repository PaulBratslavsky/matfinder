import { Text, View } from 'react-native';
import { SLOTS, dayShort, type WeekRow } from '@/lib/week';
import { makeStyles } from '@/theme/ThemeProvider';

/** The week at a glance: a row per day, a cell per time of day. Today's row is red, the next class filled. */
export function WeekGrid({ rows }: { rows: WeekRow[] }) {
  const styles = useStyles();
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <View style={styles.dayCol} />
        {SLOTS.map((s) => (
          <Text key={s.key} style={styles.slot} numberOfLines={1}>
            {s.label}
          </Text>
        ))}
      </View>
      {rows.map((row) => (
        <View key={row.day} style={styles.row}>
          <View style={styles.dayCol}>
            <Text style={[styles.day, row.isToday && styles.today, !row.hasClasses && styles.dayEmpty]}>{dayShort(row.day)}</Text>
            {row.isToday && <Text style={styles.todayTag}>Today</Text>}
          </View>
          {row.cells.map((cell) => (
            <View
              key={cell.slot}
              accessibilityLabel={cell.sessions.length ? `${dayShort(row.day)} ${cell.slot}: ${cell.label}${cell.state === 'live' ? ', on now' : cell.state === 'next' ? ', next' : ''}` : undefined}
              style={[
                styles.cell,
                cell.state === 'class' && styles.cellClass,
                cell.state === 'next' && styles.cellNext,
                cell.state === 'live' && styles.cellLive,
              ]}>
              {!!cell.label && (
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[styles.cellText, cell.state === 'done' && styles.cellTextDone, (cell.state === 'next' || cell.state === 'live') && styles.cellTextOn]}>
                  {cell.label}
                </Text>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  grid: { gap: 6 },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dayCol: { width: 44, justifyContent: 'center' },
  slot: { ...t.type.label, flex: 1, fontSize: 12, textAlign: 'center', color: t.colors.textSecondary },
  day: { fontFamily: t.fonts.heavy, textTransform: 'uppercase', fontSize: 16, lineHeight: 17, color: t.colors.text },
  today: { color: t.colors.redText },
  todayTag: { ...t.type.label, fontSize: 10, lineHeight: 11, letterSpacing: 0.8, color: t.colors.redText },
  dayEmpty: { color: t.colors.textDim },
  cell: { flex: 1, height: 36, borderRadius: t.radii.control, backgroundColor: t.colors.separator, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cellClass: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.outline },
  cellNext: { backgroundColor: t.colors.redFill },
  cellLive: { backgroundColor: t.colors.liveFill },
  cellText: { ...t.type.label, fontSize: 13, letterSpacing: 0.5, color: t.colors.text },
  cellTextDone: { color: t.colors.textSecondary },
  cellTextOn: { fontFamily: t.fonts.heavy, color: '#FFFFFF' },
}));
