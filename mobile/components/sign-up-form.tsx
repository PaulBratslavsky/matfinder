import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, type TextInput, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';

const MIN_PASSWORD = 8;

/** React Native Reusables sign-up block, wired to Better Auth. A free account unlocks full school pages. */
export function SignUpForm({ redirect }: { redirect: string }) {
  const emailInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit() {
    if (submitting) return;
    setError(null);
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
    setSubmitting(true);
    const { error: err } = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password });
    setSubmitting(false);
    if (err) return setError(err.message ?? 'Sign up failed. Try again.');
    // Back to where the user came from if it's still in the stack (e.g. Account), else replace this screen.
    router.dismissTo(redirect as never);
  }

  return (
    <View className="gap-6">
      <Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">Create your free account</CardTitle>
          <CardDescription className="text-center sm:text-left">
            See full schedules, prices, instructors and contact details for every gym.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChangeText={setName}
                autoComplete="name"
                onSubmitEditing={() => emailInputRef.current?.focus()}
                returnKeyType="next"
                submitBehavior="submit"
              />
            </View>
            <View className="gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                ref={emailInputRef}
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
                autoComplete="new-password"
                returnKeyType="send"
                onSubmitEditing={onSubmit}
              />
              <Text variant="muted">At least {MIN_PASSWORD} characters.</Text>
            </View>
            {!!error && (
              <Text role="alert" className="text-sm text-destructive">
                {error}
              </Text>
            )}
            <Button className="w-full" onPress={onSubmit} disabled={submitting || !name.trim() || !email || !password}>
              <Text>{submitting ? 'Creating account…' : 'Create account'}</Text>
            </Button>
          </View>
          <Text className="text-center text-sm">
            Already have an account?{' '}
            <Pressable onPress={() => router.replace({ pathname: '/sign-in', params: { redirect } })}>
              <Text className="text-sm underline underline-offset-4">Sign in</Text>
            </Pressable>
          </Text>
        </CardContent>
      </Card>
    </View>
  );
}
