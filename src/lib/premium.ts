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
  | { status: 'returned'; orderId: string; closed: boolean }
  | { status: 'error'; message: string };

const PENDING_ORDER_KEY = 'liftlog.pendingOrder.v1';

/**
 * Pays for a plan through MyFatoorah. The `premium` function creates a pending order and the
 * invoice, and updates the order once MyFatoorah reports the result.
 * - Web: the page leaves for MyFatoorah, which sends people back to /payment/<orderId>.
 * - Phones: an in-app browser opens; afterwards show /payment/<orderId>.
 */
export async function startCheckout(plan: PremiumPlan): Promise<CheckoutResult> {
  const returnUrl = Platform.OS === 'web' ? `${window.location.origin}/payment` : Linking.createURL('payment');
  const { data, error } = await supabase.functions.invoke<{ url: string; orderId: string }>('premium', {
    body: { action: 'checkout', plan, returnUrl, lang: currentLang() },
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
    // Remembered in case the person comes back without finishing (e.g. the browser's back button).
    try {
      window.localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify({ id: data.orderId, at: Date.now() }));
    } catch {
      // Storage can be unavailable (private mode); the order page still works from the redirect.
    }
    window.location.assign(data.url);
    return { status: 'redirected' };
  }
  const result = await WebBrowser.openAuthSessionAsync(data.url, returnUrl);
  return { status: 'returned', orderId: data.orderId, closed: result.type !== 'success' };
}

/**
 * Web: the order someone left for MyFatoorah with and came back from without finishing
 * (not through the payment result page). Returns its id once, then forgets it.
 */
export function takeAbandonedOrder(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PENDING_ORDER_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(PENDING_ORDER_KEY);
    const { id, at } = JSON.parse(raw) as { id?: string; at?: number };
    // Came back through MyFatoorah's redirect: the order page is already showing.
    if (window.location.pathname.startsWith('/payment')) return null;
    if (!id || !at || Date.now() - at > 2 * 60 * 60 * 1000) return null;
    return id;
  } catch {
    return null;
  }
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
