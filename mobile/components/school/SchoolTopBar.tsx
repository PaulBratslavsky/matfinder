import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Platform, Pressable, Share, Text, View } from 'react-native';
import { RoundButton } from '@/components/kit';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

/** The public web address of the app (EXPO_PUBLIC_WEB_URL), so shared links open for people without the app. */
const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? '').replace(/\/+$/, '');

/** Share the gym: the system share sheet, or on a desktop browser without one, copy the link. */
async function shareGym(name: string, slug: string): Promise<'shared' | 'copied' | 'failed'> {
  const url =
    Platform.OS === 'web' ? window.location.href : WEB_URL ? `${WEB_URL}/schools/${slug}` : Linking.createURL(`/schools/${slug}`);
  try {
    if (Platform.OS === 'web' && !navigator.share) {
      await navigator.clipboard.writeText(url);
      return 'copied';
    }
    await Share.share(Platform.OS === 'ios' ? { message: name, url } : { message: `${name}: ${url}`, title: name });
    return 'shared';
  } catch {
    return 'failed';
  }
}

/** Back to the gyms, and Share. */
export function SchoolTopBar({ name, slug, onBack }: { name: string; slug: string; onBack: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  return (
    <View style={styles.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to gyms" onPress={onBack} style={styles.back}>
        <View style={styles.circle}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </View>
        <Text style={styles.backText}>Gyms</Text>
      </Pressable>
      <View style={styles.right}>
        {copied && <Text style={styles.copied}>Link copied</Text>}
        <RoundButton
          label="Share gym"
          icon="share-outline"
          onPress={async () => {
            if ((await shareGym(name, slug)) === 'copied') {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }
          }}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44 },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.field,
    borderWidth: 1,
    borderColor: t.scheme === 'light' ? t.colors.surfaceBorder : t.colors.fieldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { ...t.type.label, fontSize: 16, color: t.colors.text },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  copied: { ...t.type.label, fontSize: 13, color: t.colors.textSecondary },
}));
