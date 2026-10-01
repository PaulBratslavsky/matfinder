import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';

// Placeholder so the tab exists; sign-in, sign-up and the account details arrive with the auth UI (M7).
export default function AccountScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="gap-2 p-6">
        <Text variant="h3">Account</Text>
        <Text variant="muted">
          Accounts are coming soon. You can explore every school and its next session without one.
        </Text>
      </View>
    </SafeAreaView>
  );
}
