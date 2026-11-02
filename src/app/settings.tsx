import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, ErrorText, Input, Row, Screen, Txt } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useUpdateProfile } from '@/hooks/queries';
import { useAuth } from '@/hooks/useAuth';
import { useDialog } from '@/components/Dialog';
import type { WeightUnit } from '@/lib/units';
import type { ThemeMode } from '@/store/themePreference';
import { makeStyles, useTheme } from '@/hooks/useTheme';

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const styles = useStyles();
  const { session, profile, refreshProfile, signOut } = useAuth();
  const update = useUpdateProfile(session?.user.id);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [unit, setUnit] = useState<WeightUnit>(profile?.weight_unit === 'lb' ? 'lb' : 'kg');
  const [saved, setSaved] = useState(false);
  const { confirm, dialog } = useDialog();

  const onSave = async () => {
    try {
      await update.mutateAsync({ display_name: displayName.trim() || null, bio: bio.trim() || null, weight_unit: unit });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => router.back(), 400);
    } catch {
      /* shown below */
    }
  };

  const onSignOut = async () => {
    if (await confirm('Sign out?', undefined, 'Sign out')) await signOut();
  };

  return (
    <Screen scroll contentStyle={{ paddingVertical: spacing.lg, gap: spacing.lg }}>
      {dialog}
      <View style={{ gap: spacing.md }}>
        <Txt variant="label">Profile</Txt>
        <Input label="Username" value={profile?.username ?? ''} editable={false} style={{ opacity: 0.6 }} />
        <Input label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
        <Input label="Bio" value={bio} onChangeText={setBio} placeholder="A line about your training" multiline style={{ minHeight: 72 }} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Txt variant="label">Weight unit</Txt>
        <Row style={styles.segment}>
          {(['kg', 'lb'] as WeightUnit[]).map((u) => (
            <Pressable key={u} onPress={() => setUnit(u)} style={[styles.segmentItem, unit === u && styles.segmentActive]}>
              <Txt style={{ fontWeight: '700', color: unit === u ? colors.accentText : colors.text }}>{u === 'kg' ? 'Kilograms (kg)' : 'Pounds (lb)'}</Txt>
            </Pressable>
          ))}
        </Row>
        <Txt variant="small">Weights are stored in kg and converted for display.</Txt>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Txt variant="label">Appearance</Txt>
        <Row style={styles.segment}>
          {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.segmentItem, mode === m && styles.segmentActive]}>
              <Txt style={{ fontWeight: '700', color: mode === m ? colors.accentText : colors.text }}>
                {m === 'system' ? 'System' : m === 'light' ? 'Light' : 'Dark'}
              </Txt>
            </Pressable>
          ))}
        </Row>
        <Txt variant="small">Applies right away on this device. System follows your phone or computer setting.</Txt>
      </View>

      {update.error ? <ErrorText>{update.error.message}</ErrorText> : null}
      <Button title={saved ? 'Saved' : 'Save changes'} onPress={onSave} loading={update.isPending} />

      <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <Txt variant="small" style={{ textAlign: 'center' }}>Signed in as {session?.user.email}</Txt>
        <Button variant="danger" title="Sign out" icon="log-out-outline" onPress={onSignOut} />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  segment: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 4, gap: 4 },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.accent },
}));
