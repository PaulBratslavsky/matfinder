import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { RankBar } from '@/components/kit';
import type { SchoolPage } from '@/lib/api/schools';
import { mediaUrl } from '@/lib/media';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { belts, rankBar } from '@/theme/tokens';

const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 >= 11 && n % 100 <= 13 ? 0 : Math.min(n % 10, 4) % 4] ?? 'th'}`;

/** Head coaches, two to a row: photo (or initial), name, rank, and their belt along the bottom edge. */
export function CoachCards({ instructors }: { instructors: SchoolPage['headInstructors'] }) {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  if (!instructors.length) return <Text style={styles.empty}>No coaches listed.</Text>;
  return (
    <View style={styles.grid}>
      {instructors.map((i) => {
        const photo = mediaUrl(i.photo?.formats?.thumbnail?.url ?? i.photo?.url);
        const belt = belts[i.beltRank];
        const blackBelt = i.beltRank === 'black';
        return (
          <View key={i.slug} style={styles.card}>
            <View style={styles.body}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatar} accessibilityLabel={i.name} />
              ) : (
                <View aria-hidden style={styles.avatar}>
                  <Text style={styles.initial}>{i.name.replace(/^Sample\s+(Coach\s+)?/i, '').charAt(0)}</Text>
                </View>
              )}
              <Text style={styles.name}>{i.name}</Text>
              <Text style={styles.rank}>
                {belt.label}
                {i.degree ? ` · ${ordinal(i.degree)} degree` : ''}
              </Text>
              {!!i.bio && (
                <Text style={styles.bio} numberOfLines={3}>
                  {i.bio}
                </Text>
              )}
            </View>
            <RankBar
              stripes={i.degree ?? 0}
              width="100%"
              barWidth={40}
              belt={belt.colors}
              bar={blackBelt ? rankBar.onBlack : rankBar.onOthers}
              ring={i.beltRank === 'white' && scheme === 'light' ? colors.outline : blackBelt ? colors.beltRing : 'transparent'}
              style={styles.belt}
            />
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: t.radii.card,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.surfaceBorder,
    boxShadow: `0 1px 2px ${t.colors.cardShadow}`,
    overflow: 'hidden',
  },
  body: { padding: 14, gap: 8, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: t.colors.separator, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: t.fonts.heavy, fontSize: 20, color: t.colors.text },
  name: { ...t.type.label, letterSpacing: 0, fontSize: 19, lineHeight: 20, color: t.colors.text },
  rank: { ...t.type.label, fontSize: 13, letterSpacing: 0.8, color: t.colors.textSecondary },
  bio: { ...t.type.body, fontSize: 13, color: t.colors.textSecondary },
  belt: { borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  empty: { ...t.type.body, fontSize: 15, color: t.colors.textSecondary },
}));
