import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Button, Card, ErrorText, Loading, Row, Screen, Txt } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { usePaymentOrder, type PaymentStatus } from '@/hooks/queries';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { dateLocale, t } from '@/i18n';
import { usePaywall } from '@/lib/premium';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Result page for a Premium order: accepted, declined, pending or cancelled. */
export default function PaymentScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { id, closed } = useLocalSearchParams<{ id: string; closed?: string }>();
  const order = usePaymentOrder(id, closed === '1');
  const openPaywall = usePaywall((s) => s.open);

  if (order.isLoading) return <Loading />;
  if (order.error || !order.data) {
    return (
      <Screen contentStyle={{ paddingTop: spacing.xl, gap: spacing.md }}>
        <ErrorText>{order.error?.message ?? t('Could not load this payment.')}</ErrorText>
        <Button variant="secondary" title={t('Back to LiftLog')} onPress={() => goHome()} />
      </Screen>
    );
  }

  const o = order.data;
  const look: Record<PaymentStatus, { icon: IconName; color: string; tint: string; title: string; text: string }> = {
    accepted: {
      icon: 'checkmark-circle',
      color: colors.success,
      tint: colors.successTint,
      title: t('Payment accepted'),
      text: o.premium_until
        ? t('Thank you! LiftLog Premium is active until {date}.', { date: formatDate(o.premium_until) })
        : t('Thank you! LiftLog Premium is now active.'),
    },
    declined: {
      icon: 'close-circle',
      color: colors.danger,
      tint: 'rgba(239,68,68,0.14)',
      title: t('Payment declined'),
      text: t('Your bank or card declined the payment, so you were not charged. Check your card details or try another card.'),
    },
    pending: {
      icon: 'time',
      color: colors.warning,
      tint: 'rgba(245,158,11,0.14)',
      title: t('Payment pending'),
      text: t('We are waiting for MyFatoorah to confirm your payment. This page updates by itself, so you can stay here.'),
    },
    cancelled: {
      icon: 'remove-circle',
      color: colors.muted,
      tint: colors.surfaceAlt,
      title: t('Payment cancelled'),
      text: t('The payment was cancelled and no money was taken. You can try again whenever you like.'),
    },
  };
  const s = look[o.status] ?? look.pending;

  return (
    <Screen scroll contentStyle={{ paddingTop: spacing.xl, gap: spacing.lg }}>
      <Stack.Screen options={{ title: t('Payment'), headerBackVisible: false, gestureEnabled: false }} />

      <View style={styles.hero}>
        <View style={[styles.badge, { backgroundColor: s.tint }]}>
          <Ionicons name={s.icon} size={44} color={s.color} />
        </View>
        <Txt variant="title" style={styles.center}>{s.title}</Txt>
        <Txt variant="muted" style={[styles.center, { lineHeight: 21 }]}>{s.text}</Txt>
        {o.status === 'declined' && o.status_detail ? (
          <Txt variant="small" style={styles.center}>{t('Reason: {reason}', { reason: o.status_detail })}</Txt>
        ) : null}
        {o.status === 'pending' ? (
          <Row style={{ justifyContent: 'center' }}>
            <ActivityIndicator size="small" color={colors.muted} />
            <Txt variant="small">{t('Checking…')}</Txt>
          </Row>
        ) : null}
      </View>

      <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
        <Detail label={t('Plan')} value={o.plan === 'yearly' ? t('LiftLog Premium · 1 year') : t('LiftLog Premium · 1 month')} />
        <Detail label={t('Amount')} value={`$${Number(o.amount).toFixed(2)} ${o.currency}`} />
        <Detail label={t('Order')} value={o.invoice_id ? `#${o.invoice_id}` : o.id.slice(0, 8)} />
        <Detail label={t('Date')} value={formatDate(o.created_at, true)} last />
      </Card>

      <View style={{ gap: spacing.sm }}>
        {o.status === 'accepted' ? (
          <Button title={t('Start using Premium')} icon="diamond" onPress={() => router.replace('/(tabs)/more')} />
        ) : null}
        {o.status === 'declined' || o.status === 'cancelled' ? (
          <Button
            title={t('Try again')}
            icon="refresh"
            onPress={() => {
              goHome();
              openPaywall('settings');
            }}
          />
        ) : null}
        {o.status === 'pending' ? (
          <Button variant="secondary" title={t('Check again')} icon="refresh" loading={order.isFetching} onPress={() => void order.refetch()} />
        ) : null}
        <Button variant={o.status === 'accepted' ? 'secondary' : 'ghost'} title={t('Back to LiftLog')} onPress={() => goHome()} />
      </View>
    </Screen>
  );
}

/** Leaves the payment page for the Home tab (without carrying the order id along). */
function goHome() {
  router.replace('/(tabs)');
}

function formatDate(iso: string, withTime = false): string {
  return new Date(iso).toLocaleString(dateLocale(), withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'long' });
}

function Detail({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const styles = useStyles();
  return (
    <Row style={[styles.detail, !last && styles.detailBorder]}>
      <Txt variant="muted" style={{ flex: 1 }}>{label}</Txt>
      <Txt style={{ fontWeight: '600' }}>{value}</Txt>
    </Row>
  );
}

const useStyles = makeStyles((colors) => ({
  hero: { alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md },
  badge: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  detail: { paddingVertical: spacing.md, gap: spacing.md },
  detailBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  card: { borderRadius: radius.lg },
}));
