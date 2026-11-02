import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { fetchEnabledProviders, signInWithProvider, type OAuthProvider } from '@/lib/oauth';
import { Button, ErrorText, Row, Txt } from './ui';

const LABELS: Record<OAuthProvider, string> = { google: 'Google', apple: 'Apple', github: 'GitHub' };
const ICONS: Record<OAuthProvider, 'logo-google' | 'logo-apple' | 'logo-github'> = {
  google: 'logo-google',
  apple: 'logo-apple',
  github: 'logo-github',
};

/** "Continue with …" buttons for every OAuth provider enabled in Supabase. Renders nothing if none are. */
export function SocialSignIn() {
  const { colors } = useTheme();
  const { data: providers = [] } = useQuery({ queryKey: ['oauth-providers'], queryFn: fetchEnabledProviders, staleTime: 5 * 60_000 });
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (providers.length === 0) return null;

  const start = async (p: OAuthProvider) => {
    setError(null);
    setBusy(p);
    const err = await signInWithProvider(p);
    setBusy(null);
    if (err) setError(err);
  };

  return (
    <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
      <Row style={{ gap: spacing.md }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Txt variant="small">or continue with</Txt>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </Row>
      {providers.map((p) => (
        <Button
          key={p}
          variant="secondary"
          title={`Continue with ${LABELS[p]}`}
          icon={ICONS[p]}
          loading={busy === p}
          disabled={busy !== null && busy !== p}
          onPress={() => start(p)}
        />
      ))}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}
