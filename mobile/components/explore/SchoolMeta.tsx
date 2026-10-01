import { View } from 'react-native';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import type { DirectorySchool } from '@/lib/api/schools';

/** "Drop-in $25", "Free drop-in", or nothing when the school hasn't published a fee. */
export function dropInLabel(s: Pick<DirectorySchool, 'dropInFee' | 'currency'>): string | null {
  if (s.dropInFee == null) return null;
  if (s.dropInFee === 0) return 'Free drop-in';
  const amount = Number.isInteger(s.dropInFee) ? String(s.dropInFee) : s.dropInFee.toFixed(2);
  return `Drop-in ${s.currency === 'USD' ? '$' : `${s.currency} `}${amount}`;
}

/** Visitors badge, drop-in fee and style chips, shared by the preview card and the list. */
export function SchoolBadges({ school }: { school: DirectorySchool }) {
  const fee = dropInLabel(school);
  return (
    <View className="flex-row flex-wrap items-center gap-1.5">
      {school.visitorsWelcome ? (
        <Badge variant="secondary">
          <Text>Visitors welcome</Text>
        </Badge>
      ) : (
        <Badge variant="outline">
          <Text>Members only</Text>
        </Badge>
      )}
      {fee && (
        <Badge variant="outline">
          <Text>{fee}</Text>
        </Badge>
      )}
      {school.styles.map((s) => (
        <Badge key={s} variant="outline">
          <Text>{s === 'gi' ? 'Gi' : 'No-Gi'}</Text>
        </Badge>
      ))}
    </View>
  );
}
