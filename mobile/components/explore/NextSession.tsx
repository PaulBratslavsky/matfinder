import { StyleSheet, Text, View } from 'react-native';
import type { Session } from '@/lib/api/schools';
import { nextSessionLabel, type CityNow } from '@/lib/time';
import { IOS } from './ios';

/** "On now" (green), "Open mat · 7:00 pm", or "No more sessions today": always in the city's time. */
export function NextSession({ sessions, now, size = 'sm' }: { sessions: Session[]; now: CityNow; size?: 'sm' | 'md' }) {
  const label = nextSessionLabel(sessions, now);
  const onNow = label === 'On now';
  const none = label === 'No more sessions today';
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: onNow ? IOS.green : none ? '#C7C7CC' : IOS.blue }]} />
      <Text
        style={[
          styles.text,
          size === 'md' && styles.textMd,
          onNow && styles.onNow,
          none && styles.none,
        ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 13, fontWeight: '500', color: IOS.label },
  textMd: { fontSize: 15 },
  onNow: { color: '#248A3D', fontWeight: '600' },
  none: { color: IOS.secondaryLabel, fontWeight: '400' },
});
