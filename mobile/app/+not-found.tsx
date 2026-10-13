import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text variant="h4">{"This page doesn't exist."}</Text>
        <Link href="/" asChild>
          <Button>
            <Text>Back to Explore</Text>
          </Button>
        </Link>
      </View>
    </>
  );
}
