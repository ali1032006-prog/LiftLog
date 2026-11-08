// LiftLog Premium payments through MyFatoorah, tracked as orders in public.payment_orders.
//
//   POST { action: 'checkout', plan, returnUrl, lang }  (signed in) -> creates a pending order and
//        a MyFatoorah invoice, returns { orderId, url } for the payment page.
//   GET  ?paymentId=...  MyFatoorah sends the customer here after paying or failing. We ask
//        MyFatoorah for the real status, update the order (and Premium), then send the customer
//        to the app's order page: <returnUrl>/<orderId>.
//   POST { action: 'status', orderId, cancel? }  (signed in) -> re-checks a pending order with
//        MyFatoorah and returns it. cancel: true marks it cancelled if it still isn't paid
//        (the person closed the payment page).
//
// Secrets: MYFATOORAH_API_KEY, optional MYFATOORAH_BASE_URL (defaults to the sandbox).
// Deployed with verify_jwt off because MyFatoorah's redirect carries no sign-in; the POST
// actions check the caller's session themselves.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const PLANS: Record<string, number> = { monthly: 4.99, yearly: 49.99 };
const FALLBACK_RETURN = 'https://liftlog-brown-zeta.vercel.app/payment';
const RETURN_ORIGINS = ['https://liftlog-brown-zeta.vercel.app', 'http://localhost:8081'];
const RETURN_PREFIXES = ['liftlog://', 'exp://'];

type Status = 'pending' | 'accepted' | 'declined' | 'cancelled';
type Order = {
  id: string;
  user_id: string;
  plan: string;
  amount: number;
  currency: string;
  status: Status;
  invoice_id: string | null;
  payment_id: string | null;
  status_detail: string | null;
  premium_until: string | null;
  created_at: string;
  updated_at: string;
};
type Invoice = {
  InvoiceId: number;
  InvoiceStatus: string;
  UserDefinedField?: string;
  InvoiceTransactions?: { TransactionStatus?: string; Error?: string; PaymentId?: string }[];
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function allowedReturn(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 200) return null;
  if (RETURN_PREFIXES.some((p) => value.startsWith(p))) return value;
  try {
    return RETURN_ORIGINS.includes(new URL(value).origin) ? value : null;
  } catch {
    return null;
  }
}

function env() {
  return {
    url: Deno.env.get('SUPABASE_URL')!,
    apiKey: Deno.env.get('MYFATOORAH_API_KEY'),
    base: Deno.env.get('MYFATOORAH_BASE_URL') ?? 'https://apitest.myfatoorah.com',
  };
}

function adminClient(url: string): SupabaseClient {
  return createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function myFatoorah(path: string, body: unknown): Promise<{ ok: boolean; data: any }> {
  const { apiKey, base } = env();
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok && !!data?.IsSuccess, data };
}

/** Maps MyFatoorah's invoice to our order status. */
function statusOf(inv: Invoice): { status: Status; detail: string | null; paymentId: string | null } {
  const last = inv.InvoiceTransactions?.at(-1);
  const paymentId = last?.PaymentId ?? null;
  if (inv.InvoiceStatus === 'Paid') return { status: 'accepted', detail: null, paymentId };
  if (inv.InvoiceStatus === 'Canceled') return { status: 'cancelled', detail: null, paymentId };
  if (last?.TransactionStatus === 'Failed') return { status: 'declined', detail: last.Error ?? null, paymentId };
  if (last?.TransactionStatus === 'Canceled') return { status: 'cancelled', detail: last.Error ?? null, paymentId };
  return { status: 'pending', detail: null, paymentId };
}

/** Applies MyFatoorah's view of the invoice to the order. Accepted orders never change again. */
async function applyInvoice(admin: SupabaseClient, order: Order, inv: Invoice): Promise<Order> {
  if (order.status === 'accepted') return order;
  const next = statusOf(inv);
  const patch: Partial<Order> = { updated_at: new Date().toISOString() };
  if (next.paymentId) patch.payment_id = next.paymentId;

  if (next.status === 'accepted') {
    const { error } = await admin.rpc('apply_premium_payment', {
      p_invoice_id: String(inv.InvoiceId),
      p_user_id: order.user_id,
      p_plan: order.plan,
      p_amount: order.amount,
      p_currency: order.currency,
    });
    if (error) {
      console.error('apply_premium_payment failed', error.message);
      return order; // stays pending; the next check retries
    }
    const { data: sub } = await admin.from('subscriptions').select('current_period_end').eq('user_id', order.user_id).single();
    patch.status = 'accepted';
    patch.status_detail = null;
    patch.premium_until = sub?.current_period_end ?? null;
  } else if (next.status !== 'pending') {
    patch.status = next.status;
    patch.status_detail = next.detail;
  } else if (
    (order.status === 'declined' || order.status === 'cancelled') &&
    next.paymentId &&
    next.paymentId !== order.payment_id
  ) {
    // A new attempt on the same invoice is in progress (an unpaid invoice alone stays as it was).
    patch.status = 'pending';
  }

  const { data, error } = await admin.from('payment_orders').update(patch).eq('id', order.id).select('*').single();
  if (error) console.error('order update failed', error.message);
  return (data as Order) ?? order;
}

async function signedInUser(req: Request, url: string) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await asUser.auth.getUser();
  return data?.user ? { user: data.user, asUser } : null;
}

// ---------- MyFatoorah redirect ----------

async function handleReturn(req: Request): Promise<Response> {
  const redirect = (to: string) => new Response(null, { status: 302, headers: { Location: to } });
  const paymentId = new URL(req.url).searchParams.get('paymentId');
  const { url, apiKey } = env();
  if (!paymentId || !/^[0-9A-Za-z-]{1,64}$/.test(paymentId) || !apiKey) return redirect(FALLBACK_RETURN);

  const { ok, data } = await myFatoorah('/v2/GetPaymentStatus', { Key: paymentId, KeyType: 'PaymentId' });
  const inv = data?.Data as Invoice | undefined;
  if (!ok || !inv) {
    console.error('GetPaymentStatus failed', JSON.stringify(data?.Message ?? data).slice(0, 300));
    return redirect(FALLBACK_RETURN);
  }
  let meta: { o?: string; r?: string } = {};
  try {
    meta = JSON.parse(inv.UserDefinedField ?? '{}');
  } catch {
    meta = {};
  }
  const back = allowedReturn(meta.r) ?? FALLBACK_RETURN;
  if (!meta.o) return redirect(back);

  const admin = adminClient(url);
  const { data: order } = await admin.from('payment_orders').select('*').eq('id', meta.o).maybeSingle();
  if (!order || order.invoice_id !== String(inv.InvoiceId)) return redirect(back);
  await applyInvoice(admin, order as Order, inv);
  return redirect(`${back}/${order.id}`);
}

// ---------- App actions ----------

async function handleCheckout(req: Request, body: any): Promise<Response> {
  const { url, apiKey } = env();
  const auth = await signedInUser(req, url);
  if (!auth) return json({ error: 'Not signed in', code: 'auth' }, 401);
  const plan = typeof body.plan === 'string' && body.plan in PLANS ? body.plan : null;
  if (!plan) return json({ error: 'Unknown plan', code: 'plan' }, 400);
  const returnUrl = allowedReturn(body.returnUrl);
  if (!returnUrl) return json({ error: 'Return address not allowed', code: 'return_url' }, 400);
  if (!apiKey) return json({ error: 'Payments are not set up yet', code: 'not_configured' }, 503);

  const admin = adminClient(url);
  const { data: order, error: orderError } = await admin
    .from('payment_orders')
    .insert({ user_id: auth.user.id, plan, amount: PLANS[plan], currency: 'USD' })
    .select('id')
    .single();
  if (orderError || !order) return json({ error: 'Could not create the order' }, 500);

  const { data: profile } = await auth.asUser.from('profiles').select('username, display_name').eq('id', auth.user.id).single();
  const callback = `${url}/functions/v1/premium`;
  const { ok, data } = await myFatoorah('/v2/SendPayment', {
    NotificationOption: 'LNK',
    CustomerName: (profile?.display_name || profile?.username || 'LiftLog member').slice(0, 100),
    CustomerEmail: auth.user.email ?? undefined,
    InvoiceValue: PLANS[plan],
    DisplayCurrencyIso: 'USD',
    Language: body.lang === 'ar' ? 'AR' : 'EN',
    CallBackUrl: callback,
    ErrorUrl: callback,
    CustomerReference: order.id,
    UserDefinedField: JSON.stringify({ o: order.id, r: returnUrl }),
    InvoiceItems: [{ ItemName: plan === 'yearly' ? 'LiftLog Premium (1 year)' : 'LiftLog Premium (1 month)', Quantity: 1, UnitPrice: PLANS[plan] }],
  });
  if (!ok || !data?.Data?.InvoiceURL) {
    console.error('SendPayment failed', JSON.stringify(data?.ValidationErrors ?? data?.Message ?? data).slice(0, 500));
    await admin.from('payment_orders').delete().eq('id', order.id);
    return json({ error: 'Could not start the payment', code: 'upstream' }, 502);
  }
  await admin.from('payment_orders').update({ invoice_id: String(data.Data.InvoiceId) }).eq('id', order.id);
  return json({ orderId: order.id, url: data.Data.InvoiceURL });
}

async function handleStatus(req: Request, body: any): Promise<Response> {
  const { url, apiKey } = env();
  const auth = await signedInUser(req, url);
  if (!auth) return json({ error: 'Not signed in', code: 'auth' }, 401);
  if (typeof body.orderId !== 'string') return json({ error: 'Missing order', code: 'order' }, 400);

  const admin = adminClient(url);
  const { data: found } = await admin
    .from('payment_orders')
    .select('*')
    .eq('id', body.orderId)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!found) return json({ error: 'Order not found', code: 'not_found' }, 404);
  let order = found as Order;

  if (order.status !== 'accepted' && order.invoice_id && apiKey) {
    const { ok, data } = await myFatoorah('/v2/GetPaymentStatus', { Key: order.invoice_id, KeyType: 'InvoiceId' });
    if (ok && data?.Data) order = await applyInvoice(admin, order, data.Data as Invoice);
  }
  if (body.cancel === true && order.status === 'pending') {
    const { data } = await admin
      .from('payment_orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .select('*')
      .single();
    if (data) order = data as Order;
  }
  return json({ order });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method === 'GET') return handleReturn(req);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const body = await req.json().catch(() => ({}));
  if (body.action === 'checkout') return handleCheckout(req, body);
  if (body.action === 'status') return handleStatus(req, body);
  return json({ error: 'Unknown action' }, 400);
});
