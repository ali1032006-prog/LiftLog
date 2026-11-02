import { useState } from 'react';
import { Platform, View } from 'react-native';
import { useDialog } from '@/components/Dialog';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { Button, Card, ErrorText, Input, PasswordInput, Screen, Txt } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';

type Panel = 'email' | 'password' | null;

const PROVIDER_LABEL: Record<string, string> = { email: 'Email and password', google: 'Google', apple: 'Apple', github: 'GitHub' };

/** Confirm the current password by signing in with it again. Returns an error message or null. */
async function verifyCurrentPassword(email: string, password: string): Promise<string | null> {
  if (!password) return 'Enter your current password.';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? 'Your current password is incorrect.' : null;
}

export default function AccountScreen() {
  const { colors } = useTheme();
  const { session, signOut } = useAuth();
  const { confirm, dialog } = useDialog();
  const user = session?.user;
  const email = user?.email ?? '';
  const identities = user?.identities ?? [];
  const hasPassword = identities.some((i) => i.provider === 'email');
  const methods = identities.map((i) => PROVIDER_LABEL[i.provider] ?? i.provider).join(', ') || 'Email and password';

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
      if (!/^\S+@\S+\.\S+$/.test(target)) return 'Enter a valid email address.';
      if (target.toLowerCase() === email.toLowerCase()) return 'That is already your email.';
      if (hasPassword) {
        const err = await verifyCurrentPassword(email, emailPassword);
        if (err) return err;
      }
      const { error: e } = await supabase.auth.updateUser(
        { email: target },
        Platform.OS === 'web' ? { emailRedirectTo: window.location.origin } : undefined,
      );
      return e ? e.message : null;
    }, 'Check your inbox. We sent confirmation links to your old and new email. The change applies once you confirm.');

  const sendCode = () =>
    run(async () => {
      const { error: e } = await supabase.auth.reauthenticate();
      if (e) return e.message;
      setCodeSent(true);
      return null;
    }, `We sent a verification code to ${email}.`).then(() => setPanel('password'));

  const changePassword = () =>
    run(async () => {
      if (newPassword.length < 6) return 'New password must be at least 6 characters.';
      if (newPassword !== confirmPassword) return 'The new passwords do not match.';
      if (hasPassword) {
        const err = await verifyCurrentPassword(email, currentPassword);
        if (err) return err;
        const { error: e } = await supabase.auth.updateUser({ password: newPassword });
        return e ? e.message : null;
      }
      if (!code.trim()) return 'Enter the verification code from your email.';
      const { error: e } = await supabase.auth.updateUser({ password: newPassword, nonce: code.trim() });
      return e ? e.message : null;
    }, 'Your password has been updated.');

  const deleteAccount = async () => {
    const ok = await confirm(
      'Delete your account?',
      'This permanently deletes your profile, workouts, routines and followers. It cannot be undone.',
      'Delete account',
      true,
    );
    if (!ok) return;
    setBusy(true);
    const { error: e } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    setBusy(false);
    if (e) {
      setError('Could not delete your account. Please try again.');
      return;
    }
    await signOut();
  };

  return (
    <Screen scroll contentStyle={{ paddingVertical: spacing.lg, gap: spacing.xl }}>
      {dialog}
      <SettingsGroup title="Signed in">
        <SettingsRow icon="mail-outline" label="Email" value={email} />
        <SettingsRow icon="key-outline" label="Sign-in methods" value={methods} />
      </SettingsGroup>

      {success ? <Txt style={{ color: colors.success }}>{success}</Txt> : null}
      {error && panel === null ? <ErrorText>{error}</ErrorText> : null}

      <SettingsGroup title="Security">
        <SettingsRow icon="at-outline" label="Change email" onPress={() => openPanel('email')} />
        <SettingsRow icon="lock-closed-outline" label={hasPassword ? 'Change password' : 'Set a password'} onPress={() => openPanel('password')} />
      </SettingsGroup>

      {panel === 'email' ? (
        <Card style={{ gap: spacing.md }}>
          <Txt variant="h3">Change email</Txt>
          <Input label="New email" value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          {hasPassword ? <PasswordInput label="Current password" value={emailPassword} onChangeText={setEmailPassword} autoComplete="current-password" /> : null}
          <ErrorText>{error}</ErrorText>
          <Button title="Send confirmation" onPress={changeEmail} loading={busy} />
        </Card>
      ) : null}

      {panel === 'password' ? (
        <Card style={{ gap: spacing.md }}>
          <Txt variant="h3">{hasPassword ? 'Change password' : 'Set a password'}</Txt>
          {hasPassword ? (
            <PasswordInput label="Current password" value={currentPassword} onChangeText={setCurrentPassword} autoComplete="current-password" />
          ) : (
            <View style={{ gap: spacing.sm }}>
              <Txt variant="muted">To confirm it is you, we will email a verification code to {email}.</Txt>
              {codeSent ? (
                <Input label="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" />
              ) : (
                <Button variant="secondary" title="Send code" onPress={sendCode} loading={busy} />
              )}
            </View>
          )}
          <PasswordInput label="New password" value={newPassword} onChangeText={setNewPassword} autoComplete="new-password" />
          <PasswordInput label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} autoComplete="new-password" />
          <ErrorText>{error}</ErrorText>
          <Button title="Update password" onPress={changePassword} loading={busy} disabled={!hasPassword && !codeSent} />
        </Card>
      ) : null}

      <SettingsGroup title="Danger zone" footer="Deleting your account removes all of your data from LiftLog.">
        <SettingsRow icon="trash-outline" label="Delete account" danger onPress={deleteAccount} />
      </SettingsGroup>
    </Screen>
  );
}
