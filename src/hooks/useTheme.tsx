import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { darkColors, lightColors, type Colors } from '@/constants/theme';
import { useThemePreference, type ThemeMode } from '@/store/themePreference';

type ThemeValue = {
  colors: Colors;
  scheme: 'light' | 'dark';
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

const ThemeContext = createContext<ThemeValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const mode = useThemePreference((s) => s.mode);
  const setMode = useThemePreference((s) => s.setMode);
  const scheme: 'light' | 'dark' = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
  const value = useMemo<ThemeValue>(
    () => ({ colors: scheme === 'light' ? lightColors : darkColors, scheme, mode, setMode }),
    [scheme, mode, setMode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside AppThemeProvider');
  return ctx;
}

/** Theme-aware StyleSheet: `const useStyles = makeStyles((colors) => ({ ... }))`, then `useStyles()` in a component. */
export function makeStyles<T extends NamedStyles<T>>(factory: (colors: Colors) => T) {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
