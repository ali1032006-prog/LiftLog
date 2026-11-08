import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { enterFade, enterPop, PressableScale } from './motion';
import { Button, IconButton, Row, Txt } from './ui';
import { radius, spacing } from '@/constants/theme';
import { useQueryClient } from '@tanstack/react-query';
import { keys, useMarkPremiumIntroSeen, usePremium } from '@/hooks/queries';
import { useAuth } from '@/hooks/useAuth';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { dateLocale, t } from '@/i18n';
import {
  FREE_ROUTINE_LIMIT,
  PLAN_PRICES,
  startCheckout,
  takePaymentReturn,
  usePaywall,
  YEARLY_PER_MONTH,
  YEARLY_SAVING_PERCENT,
  type PaywallReason,
  type PremiumPlan,
} from '@/lib/premium';

type IconName = ComponentProps<typeof Ionicons>['name'];

function subtitle(reason: PaywallReason | null): string {
  switch (reason) {
    case 'coach':
      return t('The AI coach is part of LiftLog Premium.');
    case 'weight':
      return t('Weight tracking is part of LiftLog Premium.');
    case 'routines':
      return t('The free plan saves up to {max} routines. Go Premium for unlimited routines.', { max: FREE_ROUTINE_LIMIT });
    default:
      return t('Train smarter and reach your goals faster.');
  }
}

/** The LiftLog Premium popup. Render once; open it with usePaywall().open(reason). */
export function Paywall() {
  const { colors } = useTheme();
  const styles = useStyles();
  const reason = usePaywall((s) => s.reason);
  const close = usePaywall((s) => s.close);
  const { isPremium, subscription } = usePremium();
  const [plan, setPlan] = useState<PremiumPlan>('yearly');
  const [busy, setBusy] = useState(false);
  const message = usePaywall((s) => s.notice);
  const setNotice = usePaywall((s) => s.setNotice);
  const queryClient = useQueryClient();

  const onClose = close;

  const onContinue = async () => {
    setBusy(true);
    setNotice(null);
    const result = await startCheckout(plan);
    if (result.status === 'redirected') return; // the page is leaving for MyFatoorah
    setBusy(false);
    if (result.status === 'success') {
      await queryClient.invalidateQueries({ queryKey: keys.subscription });
      setNotice(t('Payment received. Welcome to Premium!'));
    } else if (result.status === 'failed') {
      setNotice(t('The payment was not completed. You can try again.'));
    } else if (result.status === 'error') {
      setNotice(result.message);
    }
  };

  const features: { icon: IconName; title: string; text: string }[] = [
    { icon: 'sparkles', title: t('AI coach'), text: t('Chat with a coach that knows your workouts and body weight. Up to 20 messages a day.') },
    { icon: 'scale-outline', title: t('Weight tracking'), text: t('Log your weight, set a goal, see your trend and get tips to reach it.') },
    { icon: 'infinite', title: t('Unlimited routines'), text: t('Save as many routines as you like. The free plan saves {max}.', { max: FREE_ROUTINE_LIMIT }) },
  ];

  return (
    <Modal transparent visible={!!reason} animationType="none" onRequestClose={onClose}>
      <Animated.View entering={enterFade} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Animated.View entering={enterPop} style={styles.box}>
            <Pressable onPress={() => {}} style={{ flexShrink: 1 }}>
              <ScrollView contentContainerStyle={styles.content} bounces={false}>
                <IconButton name="close" onPress={onClose} accessibilityLabel={t('Close')} style={styles.close} />
                <View style={styles.badge}>
                  <Ionicons name="diamond" size={28} color={colors.accent} />
                </View>
                <Txt variant="title" style={styles.center}>{t('LiftLog Premium')}</Txt>
                <Txt variant="muted" style={styles.center}>{subtitle(reason)}</Txt>

                <View style={styles.features}>
                  {features.map((f) => (
                    <Row key={f.title} style={styles.feature}>
                      <View style={styles.featureIcon}>
                        <Ionicons name={f.icon} size={20} color={colors.accent} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Txt variant="h3">{f.title}</Txt>
                        <Txt variant="muted">{f.text}</Txt>
                      </View>
                    </Row>
                  ))}
                </View>

                {isPremium && subscription ? (
                  <View style={styles.active}>
                    <Row style={{ justifyContent: 'center' }}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      <Txt variant="h3">{t('You have Premium')}</Txt>
                    </Row>
                    <Txt variant="muted" style={styles.center}>
                      {t('Active until {date}', {
                        date: new Date(subscription.current_period_end).toLocaleDateString(dateLocale(), { dateStyle: 'medium' }),
                      })}
                    </Txt>
                    <Button title={t('Done')} onPress={onClose} />
                  </View>
                ) : (
                  <>
                    <View style={styles.plans} accessibilityRole="radiogroup">
                      <PlanOption
                        selected={plan === 'yearly'}
                        onPress={() => setPlan('yearly')}
                        title={t('Yearly')}
                        price={t('{price} / year', { price: PLAN_PRICES.yearly.price })}
                        detail={t('1 year of Premium · {price} / month', { price: YEARLY_PER_MONTH })}
                        tag={t('Save {percent}%', { percent: YEARLY_SAVING_PERCENT })}
                      />
                      <PlanOption
                        selected={plan === 'monthly'}
                        onPress={() => setPlan('monthly')}
                        title={t('Monthly')}
                        price={t('{price} / month', { price: PLAN_PRICES.monthly.price })}
                        detail={t('1 month of Premium')}
                      />
                    </View>
                    <Button title={t('Continue')} onPress={onContinue} loading={busy} />
                    {message ? <Txt variant="muted" style={[styles.center, { color: colors.text }]}>{message}</Txt> : null}
                    <Button variant="ghost" title={t('Not now')} onPress={onClose} />
                    <Txt variant="small" style={styles.center}>{t('One-time payment through MyFatoorah. No automatic renewal. Prices in US dollars.')}</Txt>
                  </>
                )}
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

/** Full-screen placeholder for a Premium feature, with a button that opens the popup. */
export function PremiumLocked({ reason, icon, title, text }: { reason: PaywallReason; icon: IconName; title: string; text: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const open = usePaywall((s) => s.open);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.locked}>
      <View style={styles.badge}>
        <Ionicons name={icon} size={28} color={colors.accent} />
      </View>
      <Txt variant="h2" style={styles.center}>{title}</Txt>
      <Txt variant="muted" style={styles.center}>{text}</Txt>
      <Row style={styles.lockedPill}>
        <Ionicons name="lock-closed" size={14} color={colors.muted} />
        <Txt variant="small">{t('Included in LiftLog Premium')}</Txt>
      </Row>
      <Button title={t('Unlock with Premium')} icon="diamond" onPress={() => open(reason)} style={{ alignSelf: 'stretch' }} />
    </ScrollView>
  );
}

/** Shows the Premium popup once per account, the first time someone signs in after it launched. */
export function PremiumIntro() {
  const { profile, refreshProfile } = useAuth();
  const { isPremium, loading } = usePremium();
  const open = usePaywall((s) => s.open);
  const markSeen = useMarkPremiumIntroSeen();
  const queryClient = useQueryClient();
  const shown = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (shown.current || loading || !profile || isPremium || profile.premium_intro_seen_at) return;
    shown.current = true;
    // A short delay lets the home screen appear first, so the popup reads as a welcome.
    timer.current = setTimeout(() => {
      open('intro');
      markSeen.mutate(undefined, { onSuccess: () => void refreshProfile() });
    }, 600);
  }, [loading, profile, isPremium, open, markSeen, refreshProfile]);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Back from the MyFatoorah payment page (web): show the result.
  useEffect(() => {
    const result = takePaymentReturn();
    if (!result) return;
    shown.current = true;
    if (result === 'success') {
      void queryClient.invalidateQueries({ queryKey: keys.subscription });
      open('settings', t('Payment received. Welcome to Premium!'));
    } else {
      open('settings', t('The payment was not completed. You can try again.'));
    }
  }, [open, queryClient]);

  return null;
}

function PlanOption({
  selected,
  onPress,
  title,
  price,
  detail,
  tag,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  detail: string;
  tag?: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.98}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={[styles.plan, selected && { borderColor: colors.accent, backgroundColor: colors.accentTint }]}
    >
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.accent : colors.faint} />
      <View style={{ flex: 1, gap: 2 }}>
        <Row style={{ gap: spacing.sm }}>
          <Txt variant="h3">{title}</Txt>
          {tag ? (
            <View style={styles.tag}>
              <Txt style={styles.tagText}>{tag}</Txt>
            </View>
          ) : null}
        </Row>
        <Txt variant="small">{detail}</Txt>
      </View>
      <Txt variant="h3">{price}</Txt>
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  box: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  content: { padding: spacing.xl, gap: spacing.md },
  close: { position: 'absolute', top: spacing.sm, end: spacing.sm, zIndex: 1 },
  center: { textAlign: 'center' },
  badge: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  features: { gap: spacing.md, marginVertical: spacing.sm },
  feature: { alignItems: 'flex-start', gap: spacing.md },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plans: { gap: spacing.sm },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tag: { backgroundColor: colors.success, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  tagText: { color: colors.successText, fontSize: 11, fontWeight: '700' },
  active: { gap: spacing.sm, alignItems: 'stretch' },
  locked: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  lockedPill: {
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
}));
