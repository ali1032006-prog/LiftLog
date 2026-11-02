import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { t } from '@/i18n';
import { supabase } from './supabase';

export type OAuthProvider = 'google' | 'apple' | 'github';
export const OAUTH_PROVIDERS: OAuthProvider[] = ['google', 'apple', 'github'];

// Lets the auth popup hand control back to the app on web.
WebBrowser.maybeCompleteAuthSession();

/** Providers switched on in the Supabase dashboard (public auth settings endpoint). */
export async function fetchEnabledProviders(): Promise<OAuthProvider[]> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key ?? '' } });
  if (!res.ok) return [];
  const body = (await res.json()) as { external?: Record<string, boolean> };
  return OAUTH_PROVIDERS.filter((p) => body.external?.[p]);
}

/** Sign in with an OAuth provider. Returns an error message, or null on success / redirect. */
export async function signInWithProvider(provider: OAuthProvider): Promise<string | null> {
  if (Platform.OS === 'web') {
    // Full-page redirect; the session is picked up from the returned URL when the app reloads.
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    return error ? error.message : null;
  }

  const redirectTo = makeRedirectUri({ scheme: 'liftlog', path: 'auth-callback' });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) return error?.message ?? t('Could not start sign-in.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null; // user cancelled

  const params = new URL(result.url).searchParams;
  const code = params.get('code');
  if (!code) return params.get('error_description') ?? t('Sign-in was not completed.');
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  return exchangeError ? exchangeError.message : null;
}
