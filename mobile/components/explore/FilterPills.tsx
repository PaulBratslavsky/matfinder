import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { Filters } from '@/lib/filters';
import { IOS } from './ios';

type Pill = { label: string; pressed: (f: Filters) => boolean; toggle: (f: Filters) => Filters };

// Gi and No-Gi are one choice: picking one clears the other.
const PILLS: Pill[] = [
  { label: 'Training today', pressed: (f) => f.today, toggle: (f) => ({ ...f, today: !f.today }) },
  { label: 'Visitors welcome', pressed: (f) => f.visitors, toggle: (f) => ({ ...f, visitors: !f.visitors }) },
  { label: 'Gi', pressed: (f) => f.style === 'gi', toggle: (f) => ({ ...f, style: f.style === 'gi' ? null : 'gi' }) },
  { label: 'No-Gi', pressed: (f) => f.style === 'nogi', toggle: (f) => ({ ...f, style: f.style === 'nogi' ? null : 'nogi' }) },
];

/** The four Explore filters as iOS-style pills under the search bar. */
export function FilterPills({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
      {PILLS.map((pill) => {
        const on = pill.pressed(filters);
        return (
          <Pressable
            key={pill.label}
            accessibilityRole="button"
            accessibilityLabel={pill.label}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(pill.toggle(filters))}
            style={({ pressed }) => [styles.pill, on && styles.pillOn, pressed && !on && styles.pillPressed]}>
            <Text style={[styles.text, on && styles.textOn]}>{pill.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginTop: 10, flexGrow: 0 },
  row: { gap: 8 },
  pill: { paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: IOS.fill, justifyContent: 'center' },
  pillPressed: { backgroundColor: IOS.fillPressed },
  pillOn: { backgroundColor: IOS.blue },
  text: { fontSize: 13, fontWeight: '500', color: IOS.label },
  textOn: { color: IOS.white },
});
