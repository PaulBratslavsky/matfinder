import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Filters } from '@/lib/filters';
import { makeStyles } from '@/theme/ThemeProvider';

/**
 * The Explore filters: Training today (with how many are), Visitors welcome, and Gi / No-Gi as one choice
 * (picking one clears the other). Active filters fill red.
 */
export function FilterBar({ filters, onChange, trainingToday }: { filters: Filters; onChange: (f: Filters) => void; trainingToday: number }) {
  const styles = useStyles();
  const toggle = (label: string, on: boolean, next: Filters, text = label) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={() => onChange(next)}
      style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.text, on && styles.textOn]}>{text}</Text>
    </Pressable>
  );
  const style = (label: string, value: 'gi' | 'nogi') => {
    const on = filters.style === value;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: on }}
        onPress={() => onChange({ ...filters, style: on ? null : value })}
        style={[styles.segment, on && styles.chipOn]}>
        <Text style={[styles.text, on && styles.textOn]}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
      {toggle('Training today', filters.today, { ...filters, today: !filters.today }, `Training today · ${trainingToday}`)}
      {toggle('Visitors welcome', filters.visitors, { ...filters, visitors: !filters.visitors })}
      <View style={styles.group}>
        {style('Gi', 'gi')}
        <View style={styles.groupDivider} />
        {style('No-Gi', 'nogi')}
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flexGrow: 0, marginTop: 10 },
  row: { gap: 8, paddingHorizontal: t.layout.gutter },
  chip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: t.radii.control,
    borderWidth: 1.5,
    borderColor: t.colors.outline,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: t.colors.redFill, borderColor: t.colors.redFill },
  text: { ...t.type.label, fontSize: 15, letterSpacing: 0.8, color: t.colors.text },
  textOn: { color: t.colors.onRed },
  group: { flexDirection: 'row', height: 36, borderRadius: t.radii.control, borderWidth: 1.5, borderColor: t.colors.outline, overflow: 'hidden' },
  segment: { paddingHorizontal: 12, justifyContent: 'center' },
  groupDivider: { width: 1.5, backgroundColor: t.colors.outline },
}));
