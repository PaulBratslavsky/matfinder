import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, type TextInput, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';

/** React Native Reusables sign-in block, wired to Better Auth (email + password; no reset in the proof of concept). */
export function SignInForm({ redirect }: { redirect: string }) {
  const passwordInputRef = React.useRef<TextInput>(null);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const { error: err } = await authClient.signIn.email({ email: email.trim(), password });
    setSubmitting(false);
    if (err) return setError(err.message ?? 'Sign in failed. Check your email and password.');
    router.replace(redirect as never);
  }

  return (
    <View className="gap-6">
      <Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">Sign in to MatFinder</CardTitle>
          <CardDescription className="text-center sm:text-left">
            Welcome back! Sign in to see full gym pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                returnKeyType="next"
                submitBehavior="submit"
              />
            </View>
            <View className="gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                ref={passwordInputRef}
                id="password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                returnKeyType="send"
                onSubmitEditing={onSubmit}
              />
            </View>
            {!!error && (
              <Text role="alert" className="text-sm text-destructive">
                {error}
              </Text>
            )}
            <Button className="w-full" onPress={onSubmit} disabled={submitting || !email || !password}>
              <Text>{submitting ? 'Signing in…' : 'Continue'}</Text>
            </Button>
          </View>
          <Text className="text-center text-sm">
            Don&apos;t have an account?{' '}
            <Pressable onPress={() => router.replace({ pathname: '/sign-up', params: { redirect } })}>
              <Text className="text-sm underline underline-offset-4">Sign up</Text>
            </Pressable>
          </Text>
        </CardContent>
      </Card>
    </View>
  );
}
