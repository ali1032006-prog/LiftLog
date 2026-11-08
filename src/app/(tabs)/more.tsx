import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { Button, Card, Row, Screen, Txt } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { usePremium } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';
import { dateLocale, t } from '@/i18n';
import { usePaywall } from '@/lib/premium';

/** More tab: Weight and the AI coach (Premium), plus the Premium status. */
export default function MoreTab() {
  const { colors } = useTheme();
  const { isPremium, subscription } = usePremium();
  const openPaywall = usePaywall((s) => s.open);
  const locked = isPremium ? undefined : t('Premium');

  return (
    <Screen scroll contentStyle={{ paddingVertical: spacing.lg, gap: spacing.xl }}>
      <Card style={{ gap: spacing.md }}>
        <Row>
          <Ionicons name="diamond" size={22} color={colors.accent} />
          <Txt variant="h3" style={{ flex: 1 }}>{t('LiftLog Premium')}</Txt>
          {isPremium ? (
            <Row style={{ gap: 4 }}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Txt variant="small" style={{ color: colors.success, fontWeight: '700' }}>{t('Active')}</Txt>
            </Row>
          ) : null}
        </Row>
        {isPremium && subscription ? (
          <Txt variant="muted">
            {t('Active until {date}', {
              date: new Date(subscription.current_period_end).toLocaleDateString(dateLocale(), { dateStyle: 'medium' }),
            })}
          </Txt>
        ) : (
          <View style={{ gap: spacing.md }}>
            <Txt variant="muted">{t('Unlock the AI coach, weight tracking and unlimited routines.')}</Txt>
            <Button title={t('See plans')} icon="diamond" onPress={() => openPaywall('settings')} />
          </View>
        )}
      </Card>

      <SettingsGroup title={t('Tools')}>
        <SettingsRow icon="scale-outline" label={t('Weight')} value={locked} onPress={() => router.push('/weight')} />
        <SettingsRow icon="sparkles-outline" label={t('AI coach')} value={locked} onPress={() => router.push('/coach')} />
      </SettingsGroup>
    </Screen>
  );
}
