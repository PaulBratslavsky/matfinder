import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import type { Session } from '@/lib/api/schools';
import { nextSessionLabel, type CityNow } from '@/lib/time';
import { cn } from '@/lib/utils';

/** "On now" (highlighted), "Open mat · 7:00 pm", or "No more sessions today": always in the city's time. */
export function NextSession({ sessions, now, className }: { sessions: Session[]; now: CityNow; className?: string }) {
  const label = nextSessionLabel(sessions, now);
  const onNow = label === 'On now';
  const none = label === 'No more sessions today';
  return (
    <View className={cn('flex-row items-center gap-1.5', className)}>
      <View className={cn('size-2 rounded-full', onNow ? 'bg-green-500' : none ? 'bg-muted-foreground/40' : 'bg-primary')} />
      <Text className={cn('text-sm', onNow ? 'font-semibold text-green-700' : none ? 'text-muted-foreground' : 'font-medium')}>
        {label}
      </Text>
    </View>
  );
}
