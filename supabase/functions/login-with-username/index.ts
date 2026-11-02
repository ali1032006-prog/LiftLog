// Sign in with username + password without exposing users' emails to the client.
// Looks up the email server-side, then performs a normal password sign-in and returns the session tokens.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const USERNAME_RE = /^[A-Za-z0-9_.]{3,30}$/;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');
  // Same message for unknown user and wrong password so usernames can't be probed for emails.
  const invalid = () => json({ error: 'Invalid login credentials' }, 400);
  if (!USERNAME_RE.test(username) || password.length === 0) return invalid();

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ilike treats "_" as a wildcard, so filter for an exact case-insensitive match afterwards.
  const { data: candidates, error: lookupError } = await admin
    .from('profiles')
    .select('id, username')
    .ilike('username', username)
    .limit(20);
  if (lookupError) return json({ error: 'Sign-in is temporarily unavailable' }, 500);
  const profile = candidates?.find((p) => p.username.toLowerCase() === username.toLowerCase());
  if (!profile) return invalid();

  const { data: userData } = await admin.auth.admin.getUserById(profile.id);
  const email = userData?.user?.email;
  if (!email) return invalid();

  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) return json({ error: error?.message ?? 'Invalid login credentials' }, 400);

  return json({
    session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
  });
});
