import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { enterFade, enterPop } from './motion';
import { radius, spacing } from '@/constants/theme';
import { Button, Txt } from './ui';
import { makeStyles } from '@/hooks/useTheme';

type DialogOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** null hides the cancel button (info dialog). */
  cancelLabel?: string | null;
  destructive?: boolean;
};

type OpenDialog = DialogOptions & { resolve: (ok: boolean) => void };

/**
 * In-app replacement for Alert.alert / window.confirm, which can be suppressed in browsers
 * and embedded web views. Render `dialog` once in the screen that calls `confirm`/`notify`.
 */
export function useDialog() {
  const styles = useStyles();
  const [open, setOpen] = useState<OpenDialog | null>(null);
  // Last shown content, kept after closing so the fade-out does not flash default buttons.
  const [shown, setShown] = useState<OpenDialog | null>(null);

  const ask = useCallback(
    (opts: DialogOptions) =>
      new Promise<boolean>((resolve) => {
        const next = { ...opts, resolve };
        setShown(next);
        setOpen(next);
      }),
    [],
  );

  const confirm = useCallback(
    (title: string, message?: string, confirmLabel = 'OK', destructive = false) =>
      ask({ title, message, confirmLabel, destructive, cancelLabel: 'Cancel' }),
    [ask],
  );

  const notify = useCallback(
    async (title: string, message?: string) => {
      await ask({ title, message, confirmLabel: 'OK', cancelLabel: null });
    },
    [ask],
  );

  const close = (ok: boolean) => {
    open?.resolve(ok);
    setOpen(null);
  };

  const dialog = (
    <Modal transparent visible={!!open} animationType="none" onRequestClose={() => close(false)}>
      <Animated.View entering={enterFade} style={{ flex: 1 }}>
      <Pressable style={styles.backdrop} onPress={() => close(false)}>
        <Animated.View entering={enterPop} style={styles.box}>
        <Pressable onPress={() => {}} style={{ gap: spacing.md }}>
          <Txt variant="h2">{shown?.title}</Txt>
          {shown?.message ? <Txt variant="muted">{shown.message}</Txt> : null}
          <View style={styles.actions}>
            {shown?.cancelLabel !== null ? (
              <Button variant="secondary" title={shown?.cancelLabel ?? 'Cancel'} onPress={() => close(false)} style={{ flex: 1 }} />
            ) : null}
            <Button
              variant={shown?.destructive ? 'dangerSolid' : 'primary'}
              title={shown?.confirmLabel ?? 'OK'}
              onPress={() => close(true)}
              style={{ flex: 1 }}
            />
          </View>
        </Pressable>
        </Animated.View>
      </Pressable>
      </Animated.View>
    </Modal>
  );

  return { confirm, notify, dialog };
}

const useStyles = makeStyles((colors) => ({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  box: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
}));
