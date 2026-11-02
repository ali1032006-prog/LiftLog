import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { maxContentWidth, radius, spacing, type Colors } from '@/constants/theme';
import { makeStyles, useTheme } from '@/hooks/useTheme';

// ---------- Layout ----------

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** Apply the top safe-area inset (use when the screen has no header). */
  safeTop?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({ children, scroll, padded = true, safeTop, style, contentStyle }: ScreenProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const inner = [
    styles.content,
    padded && { paddingHorizontal: spacing.lg },
    safeTop && { paddingTop: insets.top + spacing.sm },
    contentStyle,
  ];
  if (scroll) {
    return (
      <ScrollView
        style={[styles.screen, style]}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={inner}>{children}</View>
      </ScrollView>
    );
  }
  return (
    <View style={[styles.screen, style]}>
      <View style={[inner, { flex: 1 }]}>{children}</View>
    </View>
  );
}

export function Card({ style, ...rest }: ViewProps) {
  const styles = useStyles();
  return <View style={[styles.card, style]} {...rest} />;
}

export function Row({ style, ...rest }: ViewProps) {
  const styles = useStyles();
  return <View style={[styles.row, style]} {...rest} />;
}

export function Divider() {
  const styles = useStyles();
  return <View style={styles.divider} />;
}

export function Centered({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.centered}>{children}</View>;
}

export function Loading() {
  const { colors } = useTheme();
  return (
    <Centered>
      <ActivityIndicator color={colors.accent} />
    </Centered>
  );
}

// ---------- Text ----------

type TxtVariant = 'title' | 'h2' | 'h3' | 'body' | 'muted' | 'small' | 'label';

export function Txt({ variant = 'body', style, ...rest }: TextProps & { variant?: TxtVariant }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return <Text style={[styles.text, makeTextVariants(colors)[variant], style]} {...rest} />;
}

export function ErrorText({ children }: { children: ReactNode }) {
  const styles = useStyles();
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

// ---------- Inputs ----------

export function Input({ label, style, ...rest }: TextInputProps & { label?: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Txt variant="label">{label}</Txt> : null}
      <TextInput
        placeholderTextColor={colors.faint}
        selectionColor={colors.accent}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

// ---------- Buttons ----------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSolid' | 'success';

type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  style?: StyleProp<ViewStyle>;
  variant?: ButtonVariant;
  loading?: boolean;
  small?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
  textStyle?: StyleProp<TextStyle>;
};

export function Button({ title, variant = 'primary', loading, small, icon, disabled, style, textStyle, ...rest }: ButtonProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const v = makeButtonVariants(colors)[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        (pressed || isDisabled) && { opacity: 0.6 },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={v.text} /> : null}
          <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: v.text }, textStyle]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  name,
  color,
  size = 22,
  style,
  ...rest
}: PressableProps & { name: ComponentProps<typeof Ionicons>['name']; color?: string; size?: number }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.5 }, style as StyleProp<ViewStyle>]}
      {...rest}
    >
      <Ionicons name={name} size={size} color={color ?? colors.text} />
    </Pressable>
  );
}

// ---------- Avatar ----------

export function Avatar({ name, url, size = 40 }: { name: string | null | undefined; url?: string | null; size?: number }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const initials = (name ?? '?')
    .split(/[\s_.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  if (url) {
    return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: size * 0.4 }}>{initials || '?'}</Text>
    </View>
  );
}

// ---------- Empty state ----------

export function EmptyState({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={colors.faint} />
      <Txt variant="h3" style={{ textAlign: 'center' }}>{title}</Txt>
      {subtitle ? <Txt variant="muted" style={{ textAlign: 'center' }}>{subtitle}</Txt> : null}
      {children}
    </View>
  );
}

export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 64 }}>
      <Txt variant="h3">{value}</Txt>
      <Txt variant="small">{label}</Txt>
    </View>
  );
}

// ---------- Styles ----------

const makeTextVariants = (colors: Colors): Record<TxtVariant, TextStyle> => ({
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700' },
  h3: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15 },
  muted: { fontSize: 14, color: colors.muted },
  small: { fontSize: 12, color: colors.muted },
  label: { fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600' },
});

const makeButtonVariants = (colors: Colors): Record<ButtonVariant, { bg: string; text: string; border: string }> => ({
  primary: { bg: colors.accent, text: colors.accentText, border: colors.accent },
  secondary: { bg: colors.surfaceAlt, text: colors.text, border: colors.border },
  ghost: { bg: 'transparent', text: colors.accent, border: 'transparent' },
  danger: { bg: 'transparent', text: colors.danger, border: colors.danger },
  dangerSolid: { bg: colors.danger, text: '#FFFFFF', border: colors.danger },
  success: { bg: colors.success, text: colors.successText, border: colors.success },
});

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  content: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  text: { color: colors.text },
  error: { color: colors.danger, fontSize: 14 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  button: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  buttonSmall: { paddingVertical: 7, paddingHorizontal: spacing.md },
  buttonText: { fontSize: 16, fontWeight: '700' },
  iconButton: { padding: spacing.xs, alignItems: 'center', justifyContent: 'center' },
  avatar: { backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
}));

// ---------- Password input with show/hide toggle ----------

export function PasswordInput(props: TextInputProps & { label?: string }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ gap: spacing.xs }}>
      <Input {...props} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} />
      <Pressable
        accessibilityRole="button"
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        style={{ alignSelf: 'flex-start' }}
      >
        <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
          {visible ? 'Hide password' : 'Show password'}
        </Text>
      </Pressable>
    </View>
  );
}
