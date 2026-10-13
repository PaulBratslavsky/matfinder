import { Pressable, Text, View } from 'react-native';
import type { SortKey } from '@/lib/explore';
import { makeStyles } from '@/theme/ThemeProvider';

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'distance', label: 'Distance' },
  { key: 'time', label: 'Start time' },
];

/** Distance / Start time. */
export function SortToggle({ value, onChange }: { value: SortKey; onChange: (s: SortKey) => void }) {
  const styles = useStyles();
  return (
    <View role="group" accessibilityLabel="Sort gyms" style={styles.group}>
      {OPTIONS.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${o.label.toLowerCase()}`}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={[styles.option, on && styles.optionOn]}>
            <Text style={[styles.text, on && styles.textOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  group: { flexDirection: 'row', height: 30, borderRadius: 7, borderWidth: 1.5, borderColor: t.colors.outline, overflow: 'hidden' },
  option: { paddingHorizontal: 10, justifyContent: 'center' },
  optionOn: { backgroundColor: t.colors.inverse },
  text: { ...t.type.label, fontSize: 13, letterSpacing: 0.8, color: t.colors.textSecondary },
  textOn: { color: t.colors.onInverse },
}));
