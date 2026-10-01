import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useSession } from '@/hooks/useSession';
import { authClient } from '@/lib/auth-client';

export default function AccountScreen() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const user = session.data?.user;

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    // Gated school pages must not stay in the cache after signing out.
    queryClient.removeQueries({ queryKey: ['school'] });
    setSigningOut(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="w-full max-w-md gap-4 self-center p-4">
        <Text variant="h3">Account</Text>
        {session.isPending ? null : user ? (
          <Card>
            <CardHeader>
              <CardTitle>{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onPress={signOut} disabled={signingOut}>
                <Text>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{"You're browsing as a guest"}</CardTitle>
              <CardDescription>
                {"The map, search and next sessions are open to everyone. A free account shows each school's full schedule, pricing, instructors and contact details."}
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-2">
              <Button onPress={() => router.push({ pathname: '/sign-up', params: { redirect: '/account' } })}>
                <Text>Create account</Text>
              </Button>
              <Button variant="outline" onPress={() => router.push({ pathname: '/sign-in', params: { redirect: '/account' } })}>
                <Text>Sign in</Text>
              </Button>
            </CardContent>
          </Card>
        )}
      </View>
    </SafeAreaView>
  );
}
