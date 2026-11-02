import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, ErrorText, Input, PasswordInput, Screen, Txt } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { makeStyles, useTheme } from '@/hooks/useTheme';

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setError(null);
    setLoading(true);
    const id = identifier.trim();
    const err = id.includes('@') ? await signInWithEmail(id, password) : await signInWithUsername(id, password);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <Screen scroll safeTop>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.form}>
        <View style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
          <Txt variant="title">LiftLog</Txt>
          <Txt variant="muted">Track your lifts. Follow your friends.</Txt>
        </View>
        <Input
          label="Username or email"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          placeholder="ali_lifts or you@example.com"
        />
        <PasswordInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          autoComplete="password"
          textContentType="password"
          placeholder="••••••••"
          onSubmitEditing={signIn}
        />
        <ErrorText>{error}</ErrorText>
        <Button title="Sign in" onPress={signIn} loading={loading} disabled={!identifier.trim() || !password} />
        <View style={styles.footer}>
          <Txt variant="muted">New here? </Txt>
          <Link href="/(auth)/register" style={{ color: colors.accent, fontWeight: '700' }}>Create an account</Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  form: { flex: 1, justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
}));

async function signInWithEmail(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}

/** Username sign-in goes through an Edge Function so other users' emails are never exposed. */
async function signInWithUsername(username: string, password: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<{ session?: { access_token: string; refresh_token: string }; error?: string }>(
    'login-with-username',
    { body: { username, password } },
  );
  if (error) {
    // Non-2xx responses carry the JSON body on error.context
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error) return body.error as string;
    } catch {
      /* fall through */
    }
    return 'Could not sign in. Check your username and password.';
  }
  if (!data?.session) return data?.error ?? 'Invalid login credentials';
  const { error: setErr } = await supabase.auth.setSession(data.session);
  return setErr ? setErr.message : null;
}
