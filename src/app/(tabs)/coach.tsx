import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useDialog } from '@/components/Dialog';
import { PremiumLocked } from '@/components/Paywall';
import { PressableScale } from '@/components/motion';
import { ErrorText, IconButton, Loading, Row, Txt } from '@/components/ui';
import { maxContentWidth, radius, spacing } from '@/constants/theme';
import { COACH_DAILY_LIMIT, usePremium, useClearCoachChat, useCoachMessages, useSendCoachMessage, type CoachMessage } from '@/hooks/queries';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { t, tn } from '@/i18n';
import { Stack } from 'expo-router';

const SUGGESTIONS = [
  'Plan my next workout',
  'How did my last week of training go?',
  'How can I increase my bench press?',
  'What should I eat after training?',
];

/** Messages you sent in the last 24 hours, to show how many are left today. */
function usedToday(messages: CoachMessage[]): number {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  return messages.filter((m) => m.role === 'user' && new Date(m.created_at).getTime() >= since).length;
}

export default function CoachTab() {
  const { isPremium, loading } = usePremium();
  if (loading) return <Loading />;
  if (!isPremium) {
    return (
      <PremiumLocked
        reason="coach"
        icon="sparkles"
        title={t('Your AI coach')}
        text={t('Get workout plans, technique tips and progress reviews from a coach that knows your training history.')}
      />
    );
  }
  return <CoachScreen />;
}

function CoachScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { data: messages = [], isLoading } = useCoachMessages();
  const send = useSendCoachMessage();
  const clear = useClearCoachChat();
  const { confirm, dialog } = useDialog();
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const remaining = Math.max(0, COACH_DAILY_LIMIT - usedToday(messages));
  const busy = send.isPending;

  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [messages.length, pending]);

  const submit = (text: string) => {
    const message = text.trim();
    if (!message || busy || remaining === 0) return;
    setDraft('');
    setPending(message);
    send.mutate(message, {
      onError: () => setDraft(message),
      onSettled: () => setPending(null),
    });
  };

  const onClear = async () => {
    const ok = await confirm(
      t('Clear chat?'),
      t('This deletes your whole conversation with the coach. Messages you already sent today still count toward the limit.'),
      t('Clear'),
      true,
    );
    if (ok) clear.mutate();
  };

  if (isLoading) return <Loading />;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen
        options={{
          headerRight: messages.length > 0
            ? () => <IconButton name="trash-outline" onPress={onClear} accessibilityLabel={t('Clear chat')} style={{ marginRight: 12 }} />
            : undefined,
        }}
      />
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {messages.length === 0 && !pending ? (
          <View style={styles.intro}>
            <View style={styles.introIcon}><Ionicons name="sparkles" size={28} color={colors.accent} /></View>
            <Txt variant="h2" style={{ textAlign: 'center' }}>{t('Your AI coach')}</Txt>
            <Txt variant="muted" style={{ textAlign: 'center' }}>
              {t('Ask about training, technique, progress or recovery. The coach can see your workouts from the last 4 weeks.')}
            </Txt>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <PressableScale key={s} onPress={() => submit(t(s))} style={styles.suggestion} disabled={busy}>
                  <Txt style={{ color: colors.text }}>{t(s)}</Txt>
                </PressableScale>
              ))}
            </View>
          </View>
        ) : null}

        {messages.map((m) => <Bubble key={m.id} role={m.role} text={m.content} />)}
        {pending ? <Bubble role="user" text={pending} /> : null}
        {pending ? (
          <View style={[styles.bubble, styles.assistant, styles.thinking]}>
            <ActivityIndicator size="small" color={colors.muted} />
            <Txt variant="muted">{t('Thinking…')}</Txt>
          </View>
        ) : null}
        {send.error ? <ErrorText>{send.error.message}</ErrorText> : null}
      </ScrollView>

      <View style={styles.composerWrap}>
        <Row style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={remaining === 0 ? t('No messages left today') : t('Ask your coach…')}
            placeholderTextColor={colors.faint}
            style={styles.input}
            multiline
            maxLength={2000}
            editable={remaining > 0}
            onSubmitEditing={() => submit(draft)}
            blurOnSubmit={false}
            submitBehavior="submit"
            returnKeyType="send"
          />
          <IconButton
            name="arrow-up-circle"
            size={34}
            color={draft.trim() && !busy && remaining > 0 ? colors.accent : colors.faint}
            onPress={() => submit(draft)}
            disabled={!draft.trim() || busy || remaining === 0}
            accessibilityLabel={t('Send')}
          />
        </Row>
        <Txt variant="small" style={styles.footnote}>
          {tn(remaining, '{count} message left today', '{count} messages left today')} · {t('AI advice can be wrong and is not medical advice.')}
        </Txt>
      </View>
      {dialog}
    </KeyboardAvoidingView>
  );
}

function Bubble({ role, text }: { role: 'user' | 'assistant'; text: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const mine = role === 'user';
  return (
    <View style={[styles.bubble, mine ? styles.user : styles.assistant]}>
      <Txt selectable style={{ color: mine ? colors.accentText : colors.text, lineHeight: 21 }}>{text}</Txt>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  intro: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  introIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center',
  },
  suggestions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm },
  suggestion: {
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.pill,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  bubble: { maxWidth: '85%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.lg },
  user: { alignSelf: 'flex-end', backgroundColor: colors.accent, borderBottomRightRadius: radius.sm },
  assistant: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: radius.sm },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  composerWrap: {
    width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 4,
  },
  composer: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    paddingLeft: spacing.md, paddingRight: 4, paddingVertical: 4, alignItems: 'flex-end',
  },
  input: { flex: 1, color: colors.text, fontSize: 16, maxHeight: 120, paddingVertical: 8 },
  footnote: { textAlign: 'center' },
}));
