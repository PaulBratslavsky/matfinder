import { View } from 'react-native';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import type { ClassType } from '@/lib/api/schools';
import { classTypeLabel } from '@/lib/time';

export function ProgramChips({ programs, styles }: { programs: ClassType[]; styles: ('gi' | 'nogi')[] }) {
  if (!programs.length && !styles.length) return null;
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {styles.map((s) => (
        <Badge key={s}>
          <Text>{s === 'gi' ? 'Gi' : 'No-Gi'}</Text>
        </Badge>
      ))}
      {programs.map((p) => (
        <Badge key={p} variant="secondary">
          <Text>{classTypeLabel(p)}</Text>
        </Badge>
      ))}
    </View>
  );
}
