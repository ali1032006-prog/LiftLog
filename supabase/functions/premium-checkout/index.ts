// Starts a LiftLog Premium payment: creates a MyFatoorah invoice for the signed-in person and
// returns its payment page URL. The MyFatoorah key lives only in this project's secrets
// (MYFATOORAH_API_KEY). MYFATOORAH_BASE_URL defaults to the sandbox.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const PLANS: Record<string, number> = { monthly: 4.99, yearly: 49.99 };

// Where people may be sent back to after paying.
const RETURN_ORIGINS = ['https://liftlog-brown-zeta.vercel.app', 'http://localhost:8081'];
const RETURN_PREFIXES = ['liftlog://', 'exp://'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function allowedReturnUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 200) return null;
  if (RETURN_PREFIXES.some((p) => value.startsWith(p))) return value;
  try {
    const u = new URL(value);
    return RETURN_ORIGINS.includes(u.origin) ? value : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Not signed in', code: 'auth' }, 401);
  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await asUser.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'Not signed in', code: 'auth' }, 401);

  const body = await req.json().catch(() => ({}));
  const plan = typeof body.plan === 'string' && body.plan in PLANS ? body.plan : null;
  if (!plan) return json({ error: 'Unknown plan', code: 'plan' }, 400);
  const returnUrl = allowedReturnUrl(body.returnUrl);
  if (!returnUrl) return json({ error: 'Return address not allowed', code: 'return_url' }, 400);
  const lang = body.lang === 'ar' ? 'AR' : 'EN';

  const apiKey = Deno.env.get('MYFATOORAH_API_KEY');
  if (!apiKey) return json({ error: 'Payments are not set up yet', code: 'not_configured' }, 503);
  const base = Deno.env.get('MYFATOORAH_BASE_URL') ?? 'https://apitest.myfatoorah.com';

  const { data: profile } = await asUser.from('profiles').select('username, display_name').eq('id', user.id).single();
  const callback = `${url}/functions/v1/premium-callback`;

  const res = await fetch(`${base}/v2/SendPayment`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      NotificationOption: 'LNK',
      CustomerName: (profile?.display_name || profile?.username || 'LiftLog member').slice(0, 100),
      CustomerEmail: user.email ?? undefined,
      InvoiceValue: PLANS[plan],
      DisplayCurrencyIso: 'USD',
      Language: lang,
      CallBackUrl: callback,
      ErrorUrl: callback,
      CustomerReference: user.id,
      // Read back by premium-callback after MyFatoorah confirms the payment.
      UserDefinedField: JSON.stringify({ u: user.id, p: plan, r: returnUrl }),
      InvoiceItems: [{ ItemName: plan === 'yearly' ? 'LiftLog Premium (1 year)' : 'LiftLog Premium (1 month)', Quantity: 1, UnitPrice: PLANS[plan] }],
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.IsSuccess || !data?.Data?.InvoiceURL) {
    console.error('SendPayment failed', res.status, JSON.stringify(data?.ValidationErrors ?? data?.Message ?? data).slice(0, 500));
    return json({ error: 'Could not start the payment', code: 'upstream' }, 502);
  }
  return json({ url: data.Data.InvoiceURL, invoiceId: data.Data.InvoiceId });
});
