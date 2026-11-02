import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { PressableScale } from './motion';
import { Txt } from './ui';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Rounded group of settings rows with an optional title above it. */
export function SettingsGroup({ title, children, footer }: { title?: string; children: ReactNode; footer?: string }) {
  const styles = useStyles();
  return (
    <View style={{ gap: spacing.xs }}>
      {title ? <Txt variant="label" style={{ paddingHorizontal: spacing.sm }}>{title}</Txt> : null}
      <View style={styles.group}>{children}</View>
      {footer ? <Txt variant="small" style={{ paddingHorizontal: spacing.sm }}>{footer}</Txt> : null}
    </View>
  );
}

type RowProps = {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  /** Renders a switch instead of a chevron. */
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  /** Custom control on the right (e.g. a dropdown). */
  right?: ReactNode;
};

export function SettingsRow({ icon, label, value, onPress, danger, toggle, right }: RowProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const tint = danger ? colors.danger : colors.text;
  const content = (
    <>
      <View style={[styles.iconWrap, danger && { backgroundColor: 'transparent' }]}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.accent} />
      </View>
      <Txt style={{ flex: 1, color: tint, fontWeight: '500' }}>{label}</Txt>
      {value ? <Txt variant="muted" numberOfLines={1} style={{ maxWidth: '45%' }}>{value}</Txt> : null}
      {right}
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          trackColor={{ true: colors.accent, false: colors.border }}
          thumbColor="#FFFFFF"
        />
      ) : null}
      {onPress && !toggle ? <Ionicons name="chevron-forward" size={18} color={colors.faint} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <PressableScale onPress={onPress} pressedScale={0.98} style={styles.row} accessibilityRole="button">
      {content}
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentTint,
  },
}));
