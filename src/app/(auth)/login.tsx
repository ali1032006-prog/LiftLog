import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, ErrorText, Input, Screen, Txt } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (err) setError(err.message);
  };

  return (
    <Screen scroll safeTop>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.form}>
        <View style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
          <Txt variant="title">LiftLog</Txt>
          <Txt variant="muted">Track your lifts. Follow your friends.</Txt>
        </View>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          placeholder="••••••••"
          onSubmitEditing={signIn}
        />
        <ErrorText>{error}</ErrorText>
        <Button title="Sign in" onPress={signIn} loading={loading} disabled={!email || !password} />
        <View style={styles.footer}>
          <Txt variant="muted">New here? </Txt>
          <Link href="/(auth)/register" style={{ color: colors.accent, fontWeight: '700' }}>Create an account</Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1, justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
});
