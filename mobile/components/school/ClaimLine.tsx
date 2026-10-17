import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useMyClaim } from '@/hooks/useMyClaim';
import { isClaimOpen } from '@/lib/claims';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

/** Under the gym's header: "Claimed by the owner", "Your claim is being reviewed", or a link for owners to claim it. */
export function ClaimLine({ slug, claimed }: { slug: string; claimed: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const mine = useMyClaim(slug);

  if (claimed) {
    return (
      <View style={styles.row}>
        <Ionicons name="checkmark-circle" size={18} color={colors.liveText} />
        <Text style={[styles.text, styles.claimed]}>Claimed by the owner</Text>
      </View>
    );
  }
  if (isClaimOpen(mine.data?.status)) {
    return (
      <View style={styles.row}>
        <Ionicons name="time-outline" size={17} color={colors.textSecondary} />
        <Text style={styles.text}>Your claim is being reviewed. We&apos;ll contact you to confirm.</Text>
      </View>
    );
  }
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/schools/[slug]/claim', params: { slug } })} style={styles.row}>
      <Ionicons name="shield-checkmark-outline" size={17} color={colors.redText} />
      <Text style={styles.text}>
        Own or run this gym? <Text style={styles.link}>Claim it</Text>
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start' },
  text: { ...t.type.body, fontSize: 14, color: t.colors.textSecondary, flexShrink: 1 },
  claimed: { ...t.type.bodySemibold, color: t.colors.liveText },
  link: { ...t.type.bodySemibold, color: t.colors.redText, textDecorationLine: 'underline' },
}));
