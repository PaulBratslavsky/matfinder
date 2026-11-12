import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

/** The gym's own notice while it applies ("Closed Nov 27 for Thanksgiving"). Renders nothing without one. */
export function NoticeBanner({ notice }: { notice: string | null }) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (!notice) return null;
  return (
    <View role="alert" accessibilityLabel={`Notice: ${notice}`} style={styles.row}>
      <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
      <Text style={styles.text}>{notice}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start', backgroundColor: t.colors.warningBg, borderRadius: t.radii.chip, paddingHorizontal: 8, paddingVertical: 4 },
  text: { ...t.type.bodySemibold, fontSize: 14, color: t.colors.warning, flexShrink: 1 },
}));
