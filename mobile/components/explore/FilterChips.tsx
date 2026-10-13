import { ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Toggle } from '@/components/ui/toggle';
import type { Filters } from '@/lib/filters';
import { cn } from '@/lib/utils';

type Chip = { label: string; pressed: (f: Filters) => boolean; toggle: (f: Filters) => Filters };

// Gi and No-Gi are one choice: picking one clears the other.
const CHIPS: Chip[] = [
  { label: 'Training today', pressed: (f) => f.today, toggle: (f) => ({ ...f, today: !f.today }) },
  { label: 'Visitors welcome', pressed: (f) => f.visitors, toggle: (f) => ({ ...f, visitors: !f.visitors }) },
  { label: 'Gi', pressed: (f) => f.style === 'gi', toggle: (f) => ({ ...f, style: f.style === 'gi' ? null : 'gi' }) },
  { label: 'No-Gi', pressed: (f) => f.style === 'nogi', toggle: (f) => ({ ...f, style: f.style === 'nogi' ? null : 'nogi' }) },
];

export function FilterChips({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      {CHIPS.map((chip) => {
        const pressed = chip.pressed(filters);
        return (
          <Toggle
            key={chip.label}
            variant="outline"
            size="sm"
            pressed={pressed}
            onPressedChange={() => onChange(chip.toggle(filters))}
            accessibilityLabel={chip.label}
            className={cn('rounded-full bg-background px-3', pressed && 'border-primary bg-primary')}>
            <Text className={cn('text-sm', pressed && 'text-primary-foreground')}>{chip.label}</Text>
          </Toggle>
        );
      })}
    </ScrollView>
  );
}
