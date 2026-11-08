import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { I18nManager, Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import common from './ar/common';
import plurals from './ar/plurals';
import premium from './ar/premium';
import settings from './ar/settings';
import social from './ar/social';
import workout from './ar/workout';

export type Lang = 'en' | 'ar';

/** English text -> Arabic text. English strings are the keys, so untranslated text falls back to English. */
const AR: Record<string, string> = { ...common, ...social, ...workout, ...settings, ...premium, ...plurals };

type Vars = Record<string, string | number>;

/** Applies the layout direction: the page's `dir` on web, the native RTL flag on phones. */
function applyDirection(lang: Lang) {
  const rtl = lang === 'ar';
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
    return;
  }
  I18nManager.allowRTL(rtl);
  if (I18nManager.isRTL !== rtl) {
    I18nManager.forceRTL(rtl);
    // iOS and Android only change layout direction on launch, so restart once.
    void reloadAppAsync('Language changed');
  }
}

/** Language choice, stored per device. */
export const useLanguage = create<{ lang: Lang; setLang: (lang: Lang) => void }>()(
  persist(
    (set) => ({
      lang: 'en',
      setLang: (lang) => {
        set({ lang });
        applyDirection(lang);
      },
    }),
    {
      name: 'liftlog.language.v1',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => applyDirection(state?.lang ?? 'en'),
    },
  ),
);

export const currentLang = (): Lang => useLanguage.getState().lang;
export const isRTL = (): boolean => currentLang() === 'ar';

/** Locale for dates and numbers (Arabic with Western digits, to match weights and reps). */
export const dateLocale = (): string | undefined => (isRTL() ? 'ar-u-nu-latn' : undefined);

function fill(text: string, vars?: Vars): string {
  return vars ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : text;
}

/**
 * Translate a user-visible English string. Use `{name}` placeholders for values:
 * t('Signed in as {email}', { email }). Call it during render or in handlers, never at module level.
 */
export function t(text: string, vars?: Vars): string {
  return fill(currentLang() === 'ar' ? (AR[text] ?? text) : text, vars);
}

/** Arabic plural category (CLDR rules): 0 zero, 1 one, 2 two, 3-10 few, 11-99 many, else other. */
function arabicForm(n: number): 'zero' | 'one' | 'two' | 'few' | 'many' | 'other' {
  const abs = Math.abs(Math.trunc(n));
  const mod = abs % 100;
  if (abs === 0) return 'zero';
  if (abs === 1) return 'one';
  if (abs === 2) return 'two';
  if (mod >= 3 && mod <= 10) return 'few';
  if (mod >= 11 && mod <= 99) return 'many';
  return 'other';
}

/**
 * Count-aware text: tn(n, '{count} set', '{count} sets'). In Arabic, a form-specific entry
 * ('{count} sets|few', see ar/plurals.ts) is used when present, otherwise the one/other entry.
 */
export function tn(count: number, one: string, other: string, vars?: Vars): string {
  const all = { count, ...vars };
  if (currentLang() === 'ar') {
    const form = arabicForm(count);
    const specific = form === 'one' ? undefined : AR[`${other}|${form}`];
    if (specific) return fill(specific, all);
  }
  return t(count === 1 ? one : other, all);
}

/** Same English text, different meaning: tc('button', 'Following') looks up 'button::Following' first. */
export function tc(context: string, text: string, vars?: Vars): string {
  if (currentLang() === 'ar') {
    const specific = AR[`${context}::${text}`];
    if (specific) return fill(specific, vars);
  }
  return t(text, vars);
}
