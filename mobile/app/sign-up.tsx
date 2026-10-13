import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SignUpForm } from '@/components/sign-up-form';
import { safeRedirect, useSession } from '@/hooks/useSession';

export default function SignUpScreen() {
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const target = safeRedirect(redirect);
  const session = useSession();
  // Already signed in (e.g. after signing in on another tab): go where the user was heading.
  if (session.data?.user) return <Redirect href={target as never} />;
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="flex-grow justify-center bg-background p-4 sm:p-6">
      <View className="w-full max-w-sm self-center">
        <SignUpForm redirect={target} />
      </View>
    </ScrollView>
  );
}
