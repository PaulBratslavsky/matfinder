import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

/** "Something wrong? Report a problem": opens the report screen (which asks a signed-out user to sign in). */
export function ReportLink({ slug }: { slug: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/schools/[slug]/report', params: { slug } })} style={styles.row}>
      <Ionicons name="flag-outline" size={15} color={colors.textSecondary} />
      <Text style={styles.text}>
        Something wrong? <Text style={styles.link}>Report a problem</Text>
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' },
  text: { ...t.type.body, fontSize: 13, color: t.colors.textSecondary },
  link: { ...t.type.bodySemibold, color: t.colors.redText, textDecorationLine: 'underline' },
}));
