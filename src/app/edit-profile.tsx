import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Avatar, Button, ErrorText, Input, Row, Screen, Txt } from '@/components/ui';
import { pathFromPublicUrl, photoUrl, pickImage, removePhotos, uploadPhoto } from '@/lib/photos';
import { spacing } from '@/constants/theme';
import { useUpdateProfile } from '@/hooks/queries';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';

const USERNAME_RE = /^[A-Za-z0-9_.]{3,30}$/;

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const { session, profile, refreshProfile } = useAuth();
  const update = useUpdateProfile(session?.user.id);
  const [username, setUsername] = useState(profile?.username ?? '');
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const setAvatar = async (url: string | null) => {
    const old = pathFromPublicUrl('avatars', profile?.avatar_url);
    await update.mutateAsync({ avatar_url: url });
    await refreshProfile();
    if (old) await removePhotos('avatars', [old]);
  };

  const onChangePhoto = async () => {
    if (!session) return;
    setError(null);
    try {
      const image = await pickImage({ square: true });
      if (!image) return;
      setPhotoBusy(true);
      const path = await uploadPhoto('avatars', session.user.id, image, 512);
      await setAvatar(photoUrl('avatars', path));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update your photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const onRemovePhoto = async () => {
    setError(null);
    setPhotoBusy(true);
    try {
      await setAvatar(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove your photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const clean = username.trim();
  const changed = clean.toLowerCase() !== (profile?.username ?? '').toLowerCase();
  const valid = USERNAME_RE.test(clean);

  useEffect(() => {
    if (!changed || !valid) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc('username_available', { p_username: clean });
      if (!cancelled) setAvailable(data ?? null);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [clean, changed, valid]);

  const onSave = async () => {
    setError(null);
    if (!valid) {
      setError('Username must be 3 to 30 characters: letters, numbers, dots or underscores.');
      return;
    }
    try {
      await update.mutateAsync({
        ...(clean !== profile?.username ? { username: clean } : {}),
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      });
      await refreshProfile();
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('profiles_username_lower_idx') ? 'That username is taken.' : msg);
    }
  };

  const hint = !changed ? null : !valid ? 'Letters, numbers, dots, underscores · 3 to 30 characters' : available === false ? 'That username is taken' : available ? 'Username is available' : 'Checking…';

  return (
    <Screen scroll contentStyle={{ paddingVertical: spacing.lg, gap: spacing.lg }}>
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <Avatar name={profile?.display_name || profile?.username} url={profile?.avatar_url} size={96} />
        <Row style={{ gap: spacing.sm }}>
          <Button small variant="secondary" icon="camera-outline" title={profile?.avatar_url ? 'Change photo' : 'Add photo'} onPress={onChangePhoto} loading={photoBusy} />
          {profile?.avatar_url ? <Button small variant="ghost" title="Remove photo" onPress={onRemovePhoto} disabled={photoBusy} /> : null}
        </Row>
      </View>
      <View style={{ gap: spacing.xs }}>
        <Input
          label="Username"
          value={username}
          onChangeText={(t) => {
            setUsername(t);
            setAvailable(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {hint ? (
          <Txt variant="small" style={{ color: available === false || !valid ? colors.danger : available ? colors.success : colors.muted }}>{hint}</Txt>
        ) : null}
      </View>
      <Input label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
      <Input label="Bio" value={bio} onChangeText={setBio} placeholder="A line about your training" multiline style={{ minHeight: 88 }} />
      <ErrorText>{error}</ErrorText>
      <Button title="Save" onPress={onSave} loading={update.isPending} disabled={changed && available === false} />
    </Screen>
  );
}
