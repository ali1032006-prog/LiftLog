import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { currentLang, t } from '@/i18n';
import { supabase } from './supabase';

export type PremiumPlan = 'monthly' | 'yearly';

/** Prices shown on the paywall (USD). Keep in sync with the payment provider's products. */
export const PLAN_PRICES: Record<PremiumPlan, { price: string; amount: number }> = {
  monthly: { price: '$4.99', amount: 4.99 },
  yearly: { price: '$49.99', amount: 49.99 },
};

/** Yearly price per month, e.g. "$4.17". */
export const YEARLY_PER_MONTH = `$${(PLAN_PRICES.yearly.amount / 12).toFixed(2)}`;

/** Whole-percent saving of yearly over 12 months of monthly, e.g. 16. */
export const YEARLY_SAVING_PERCENT = Math.floor((1 - PLAN_PRICES.yearly.amount / (PLAN_PRICES.monthly.amount * 12)) * 100);

/** Routines you can save on the free plan (also enforced in the database). Premium is unlimited. */
export const FREE_ROUTINE_LIMIT = 4;

export type CheckoutResult =
  | { status: 'redirected' }
  | { status: 'success' }
  | { status: 'failed' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/**
 * Pays for a plan through MyFatoorah. The premium-checkout function creates the invoice and
 * premium-callback confirms the payment with MyFatoorah and adds the Premium time.
 * On web the page leaves for the payment page and comes back with ?premium=success|failed.
 */
export async function startCheckout(plan: PremiumPlan): Promise<CheckoutResult> {
  const returnUrl = Platform.OS === 'web' ? `${window.location.origin}/` : Linking.createURL('premium');
  const { data, error } = await supabase.functions.invoke<{ url: string }>('premium-checkout', {
    body: { plan, returnUrl, lang: currentLang() },
  });
  if (error || !data?.url) {
    let code: string | undefined;
    try {
      code = (await (error as { context?: Response } | null)?.context?.json())?.code;
    } catch {
      code = undefined;
    }
    return {
      status: 'error',
      message: code === 'not_configured' ? t('Payments are not set up yet.') : t('Could not start the payment. Try again.'),
    };
  }
  if (Platform.OS === 'web') {
    window.location.assign(data.url);
    return { status: 'redirected' };
  }
  const result = await WebBrowser.openAuthSessionAsync(data.url, returnUrl);
  if (result.type !== 'success') return { status: 'cancelled' };
  return { status: new URL(result.url).searchParams.get('premium') === 'success' ? 'success' : 'failed' };
}

/** On web, reads and clears the ?premium=success|failed the payment page sends people back with. */
export function takePaymentReturn(): 'success' | 'failed' | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const value = url.searchParams.get('premium');
  if (value !== 'success' && value !== 'failed') return null;
  url.searchParams.delete('premium');
  window.history.replaceState(null, '', url.toString());
  return value;
}

/** Why the paywall was opened; picks its heading. */
export type PaywallReason = 'intro' | 'coach' | 'weight' | 'routines' | 'settings';

/** Opens the Premium popup from anywhere in the app. */
export const usePaywall = create<{
  reason: PaywallReason | null;
  /** Message shown under the plans, e.g. a payment result. */
  notice: string | null;
  open: (reason: PaywallReason, notice?: string) => void;
  setNotice: (notice: string | null) => void;
  close: () => void;
}>()((set) => ({
  reason: null,
  notice: null,
  open: (reason, notice) => set({ reason, notice: notice ?? null }),
  setNotice: (notice) => set({ notice }),
  close: () => set({ reason: null, notice: null }),
}));
