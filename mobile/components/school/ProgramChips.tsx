import { View } from 'react-native';
import { Chip } from '@/components/kit';
import type { ClassType } from '@/lib/api/schools';
import { classTypeLabel } from '@/lib/time';

export function ProgramChips({ programs, styles }: { programs: ClassType[]; styles: ('gi' | 'nogi')[] }) {
  if (!programs.length && !styles.length) return null;
  return (
    <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {styles.map((s) => (
        <Chip key={s} label={s === 'gi' ? 'Gi' : 'No-Gi'} />
      ))}
      {programs.map((p) => (
        <Chip key={p} label={classTypeLabel(p)} />
      ))}
    </View>
  );
}
