import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Fragment } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Card } from '@/components/kit';
import type { SchoolPage } from '@/lib/api/schools';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

type Row = { icon: ComponentProps<typeof Ionicons>['name']; label: string; value: string; url: string };

const bare = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** Call, email, website, Instagram and the team's site, one tappable row each. */
export function ContactList({ contact, teamWebsite }: { contact: SchoolPage['contact']; teamWebsite?: string | null }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const rows = [
    contact?.phone && { icon: 'call-outline', label: 'Call', value: contact.phone, url: `tel:${contact.phone.replace(/[^\d+]/g, '')}` },
    contact?.email && { icon: 'mail-outline', label: 'Email', value: contact.email, url: `mailto:${contact.email}` },
    contact?.website && { icon: 'globe-outline', label: 'Website', value: bare(contact.website), url: contact.website },
    contact?.instagram && { icon: 'logo-instagram', label: 'Instagram', value: `@${contact.instagram}`, url: `https://instagram.com/${contact.instagram}` },
    teamWebsite && { icon: 'people-outline', label: 'Team site', value: bare(teamWebsite), url: teamWebsite },
  ].filter(Boolean) as Row[];
  if (!rows.length) return <Text style={styles.empty}>No contact details listed.</Text>;
  return (
    <Card padded={false} style={styles.card}>
      {rows.map((r, i) => (
        <Fragment key={r.url}>
          {i > 0 && <View style={styles.divider} />}
          <Pressable accessibilityRole="link" accessibilityLabel={`${r.label}: ${r.value}`} onPress={() => Linking.openURL(r.url)} style={styles.row}>
            <Ionicons name={r.icon} size={18} color={colors.text} />
            <Text style={styles.label}>{r.label}</Text>
            <Text style={styles.value} numberOfLines={1}>
              {r.value}
            </Text>
          </Pressable>
        </Fragment>
      ))}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  card: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  label: { ...t.type.label, width: 82, fontSize: 15, color: t.colors.text },
  value: { ...t.type.body, flex: 1, fontSize: 15, color: t.colors.textSecondary },
  divider: { height: 1, backgroundColor: t.colors.separator },
  empty: { ...t.type.body, fontSize: 15, color: t.colors.textSecondary },
}));
