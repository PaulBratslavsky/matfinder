import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-lg font-semibold">{title}</Text>
      {children}
    </View>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <Text variant="muted">{children}</Text>;
}
