import { useState } from 'react';
import { Platform, View } from 'react-native';
import { useDialog } from '@/components/Dialog';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { Button, Card, ErrorText, Input, PasswordInput, Screen, Txt } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { t } from '@/i18n';

type Panel = 'email' | 'password' | null;

const providerLabel = (provider: string): string =>
  ({ email: t('Email and password'), google: 'Google', apple: 'Apple', github: 'GitHub' } as Record<string, string>)[provider] ?? provider;

/** Confirm the current password by signing in with it again. Returns an error message or null. */
async function verifyCurrentPassword(email: string, password: string): Promise<string | null> {
  if (!password) return t('Enter your current password.');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? t('Your current password is incorrect.') : null;
}

export default function AccountScreen() {
  const { colors } = useTheme();
  const { session, signOut } = useAuth();
  const { confirm, dialog } = useDialog();
  const user = session?.user;
  const email = user?.email ?? '';
  const identities = user?.identities ?? [];
  const hasPassword = identities.some((i) => i.provider === 'email');
  const methods = identities.map((i) => providerLabel(i.provider)).join(t(', ')) || t('Email and password');

  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Email form
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');

  const openPanel = (p: Panel) => {
    setPanel(panel === p ? null : p);
    setError(null);
    setSuccess(null);
  };

  const run = async (fn: () => Promise<string | null>, successMessage: string) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    const err = await fn();
    setBusy(false);
    if (err) setError(err);
    else {
      setSuccess(successMessage);
      setPanel(null);
    }
  };

  const changeEmail = () =>
    run(async () => {
      const target = newEmail.trim();
      if (!/^\S+@\S+\.\S+$/.test(target)) return t('Enter a valid email address.');
      if (target.toLowerCase() === email.toLowerCase()) return t('That is already your email.');
      if (hasPassword) {
        const err = await verifyCurrentPassword(email, emailPassword);
        if (err) return err;
      }
      const { error: e } = await supabase.auth.updateUser(
        { email: target },
        Platform.OS === 'web' ? { emailRedirectTo: window.location.origin } : undefined,
      );
      return e ? e.message : null;
    }, t('Check your inbox. We sent confirmation links to your old and new email. The change applies once you confirm.'));

  const sendCode = () =>
    run(async () => {
      const { error: e } = await supabase.auth.reauthenticate();
      if (e) return e.message;
      setCodeSent(true);
      return null;
    }, t('We sent a verification code to {email}.', { email })).then(() => setPanel('password'));

  const changePassword = () =>
    run(async () => {
      if (newPassword.length < 6) return t('New password must be at least 6 characters.');
      if (newPassword !== confirmPassword) return t('The new passwords do not match.');
      if (hasPassword) {
        const err = await verifyCurrentPassword(email, currentPassword);
        if (err) return err;
        const { error: e } = await supabase.auth.updateUser({ password: newPassword });
        return e ? e.message : null;
      }
      if (!code.trim()) return t('Enter the verification code from your email.');
      const { error: e } = await supabase.auth.updateUser({ password: newPassword, nonce: code.trim() });
      return e ? e.message : null;
    }, t('Your password has been updated.'));

  const deleteAccount = async () => {
    const ok = await confirm(
      t('Delete your account?'),
      t('This permanently deletes your profile, workouts, routines and followers. It cannot be undone.'),
      t('Delete account'),
      true,
    );
    if (!ok) return;
    setBusy(true);
    const { error: e } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    setBusy(false);
    if (e) {
      setError(t('Could not delete your account. Please try again.'));
      return;
    }
    await signOut();
  };

  return (
    <Screen scroll contentStyle={{ paddingVertical: spacing.lg, gap: spacing.xl }}>
      {dialog}
      <SettingsGroup title={t('Signed in')}>
        <SettingsRow icon="mail-outline" label={t('Email')} value={email} />
        <SettingsRow icon="key-outline" label={t('Sign-in methods')} value={methods} />
      </SettingsGroup>

      {success ? <Txt style={{ color: colors.success }}>{success}</Txt> : null}
      {error && panel === null ? <ErrorText>{error}</ErrorText> : null}

      <SettingsGroup title={t('Security')}>
        <SettingsRow icon="at-outline" label={t('Change email')} onPress={() => openPanel('email')} />
        <SettingsRow icon="lock-closed-outline" label={hasPassword ? t('Change password') : t('Set a password')} onPress={() => openPanel('password')} />
      </SettingsGroup>

      {panel === 'email' ? (
        <Card style={{ gap: spacing.md }}>
          <Txt variant="h3">{t('Change email')}</Txt>
          <Input label={t('New email')} value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          {hasPassword ? <PasswordInput label={t('Current password')} value={emailPassword} onChangeText={setEmailPassword} autoComplete="current-password" /> : null}
          <ErrorText>{error}</ErrorText>
          <Button title={t('Send confirmation')} onPress={changeEmail} loading={busy} />
        </Card>
      ) : null}

      {panel === 'password' ? (
        <Card style={{ gap: spacing.md }}>
          <Txt variant="h3">{hasPassword ? t('Change password') : t('Set a password')}</Txt>
          {hasPassword ? (
            <PasswordInput label={t('Current password')} value={currentPassword} onChangeText={setCurrentPassword} autoComplete="current-password" />
          ) : (
            <View style={{ gap: spacing.sm }}>
              <Txt variant="muted">{t('To confirm it is you, we will email a verification code to {email}.', { email })}</Txt>
              {codeSent ? (
                <Input label={t('Verification code')} value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" />
              ) : (
                <Button variant="secondary" title={t('Send code')} onPress={sendCode} loading={busy} />
              )}
            </View>
          )}
          <PasswordInput label={t('New password')} value={newPassword} onChangeText={setNewPassword} autoComplete="new-password" />
          <PasswordInput label={t('Confirm new password')} value={confirmPassword} onChangeText={setConfirmPassword} autoComplete="new-password" />
          <ErrorText>{error}</ErrorText>
          <Button title={t('Update password')} onPress={changePassword} loading={busy} disabled={!hasPassword && !codeSent} />
        </Card>
      ) : null}

      <SettingsGroup title={t('Danger zone')} footer={t('Deleting your account removes all of your data from LiftLog.')}>
        <SettingsRow icon="trash-outline" label={t('Delete account')} danger onPress={deleteAccount} />
      </SettingsGroup>
    </Screen>
  );
}
