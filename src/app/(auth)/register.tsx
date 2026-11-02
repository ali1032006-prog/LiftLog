import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SocialSignIn } from '@/components/SocialSignIn';
import { Button, ErrorText, Input, PasswordInput, Screen, Txt } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { t } from '@/i18n';

const USERNAME_RE = /^[A-Za-z0-9_.]{3,30}$/;

export default function RegisterScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const cleanUsername = username.trim();
  const usernameValid = USERNAME_RE.test(cleanUsername);

  // Debounced username availability check
  useEffect(() => {
    if (!usernameValid) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc('username_available', { p_username: cleanUsername });
      if (!cancelled) setAvailable(data ?? null);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cleanUsername, usernameValid]);

  const signUp = async () => {
    setError(null);
    if (!usernameValid) {
      setError(t('Username must be 3–30 characters: letters, numbers, dots or underscores.'));
      return;
    }
    if (password.length < 6) {
      setError(t('Password must be at least 6 characters.'));
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: cleanUsername } },
    });
    setLoading(false);
    if (err) {
      setError(t(err.message));
      return;
    }
    // When email confirmation is enabled in Supabase there is no session yet.
    if (!data.session) setConfirmSent(true);
  };

  if (confirmSent) {
    return (
      <Screen scroll safeTop>
        <View style={styles.form}>
          <Txt variant="title">{t('Check your email')}</Txt>
          <Txt variant="muted">
            {t('We sent a confirmation link to {email}. Open it, then come back and sign in.', { email: email.trim() })}
          </Txt>
          <Button title={t('Back to sign in')} onPress={() => router.replace('/(auth)/login')} />
        </View>
      </Screen>
    );
  }

  const usernameHint =
    cleanUsername.length === 0 ? null
    : !usernameValid ? t('Letters, numbers, dots, underscores · 3–30 chars')
    : available === false ? t('That username is taken')
    : available === true ? t('Username is available')
    : t('Checking…');

  return (
    <Screen scroll safeTop>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.form}>
        <View style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
          <Txt variant="title">{t('Create account')}</Txt>
          <Txt variant="muted">{t('Pick a username your friends can find you by.')}</Txt>
        </View>
        <View style={{ gap: spacing.xs }}>
          <Input
            label={t('Username')}
            value={username}
            onChangeText={(text) => { setUsername(text); setAvailable(null); }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('e.g. ali_lifts')}
          />
          {usernameHint ? (
            <Txt variant="small" style={{ color: available === false || (cleanUsername && !usernameValid) ? colors.danger : available ? colors.success : colors.muted }}>
              {usernameHint}
            </Txt>
          ) : null}
        </View>
        <Input
          label={t('Email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <PasswordInput
          label={t('Password')}
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          placeholder={t('At least 6 characters')}
          onSubmitEditing={signUp}
        />
        <ErrorText>{error}</ErrorText>
        <Button
          title={t('Create account')}
          onPress={signUp}
          loading={loading}
          disabled={!email || !password || !usernameValid || available === false}
        />
        <SocialSignIn />
        <View style={styles.footer}>
          <Txt variant="muted">{t('Already have an account?')} </Txt>
          <Link href="/(auth)/login" style={{ color: colors.accent, fontWeight: '700' }}>{t('Sign in')}</Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  form: { flex: 1, justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
}));
