// MyFatoorah sends the customer here after paying (or failing) with ?paymentId=...
// We ask MyFatoorah for the real status (never trusting the URL), record a paid invoice once,
// extend the person's Premium, then send them back to the app.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const FALLBACK_RETURN = 'https://liftlog-brown-zeta.vercel.app';
const RETURN_ORIGINS = ['https://liftlog-brown-zeta.vercel.app', 'http://localhost:8081'];
const RETURN_PREFIXES = ['liftlog://', 'exp://'];

function safeReturn(value: unknown): string {
  if (typeof value !== 'string') return FALLBACK_RETURN;
  if (RETURN_PREFIXES.some((p) => value.startsWith(p))) return value;
  try {
    return RETURN_ORIGINS.includes(new URL(value).origin) ? value : FALLBACK_RETURN;
  } catch {
    return FALLBACK_RETURN;
  }
}

function redirect(to: string, result: 'success' | 'failed'): Response {
  const sep = to.includes('?') ? '&' : '?';
  return new Response(null, { status: 302, headers: { Location: `${to}${sep}premium=${result}` } });
}

Deno.serve(async (req: Request) => {
  const paymentId = new URL(req.url).searchParams.get('paymentId');
  if (!paymentId || !/^[0-9A-Za-z-]{1,64}$/.test(paymentId)) return redirect(FALLBACK_RETURN, 'failed');

  const apiKey = Deno.env.get('MYFATOORAH_API_KEY');
  if (!apiKey) return redirect(FALLBACK_RETURN, 'failed');
  const base = Deno.env.get('MYFATOORAH_BASE_URL') ?? 'https://apitest.myfatoorah.com';

  const res = await fetch(`${base}/v2/GetPaymentStatus`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ Key: paymentId, KeyType: 'PaymentId' }),
  });
  const data = await res.json().catch(() => null);
  const invoice = data?.Data;
  if (!res.ok || !data?.IsSuccess || !invoice) {
    console.error('GetPaymentStatus failed', res.status, JSON.stringify(data?.Message ?? data).slice(0, 300));
    return redirect(FALLBACK_RETURN, 'failed');
  }

  let meta: { u?: string; p?: string; r?: string } = {};
  try {
    meta = JSON.parse(invoice.UserDefinedField ?? '{}');
  } catch {
    meta = {};
  }
  const back = safeReturn(meta.r);
  if (invoice.InvoiceStatus !== 'Paid' || !meta.u || (meta.p !== 'monthly' && meta.p !== 'yearly')) {
    return redirect(back, 'failed');
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.rpc('apply_premium_payment', {
    p_invoice_id: String(invoice.InvoiceId),
    p_user_id: meta.u,
    p_plan: meta.p,
    // InvoiceDisplayValue is the price shown to the customer, e.g. "4.990 USD"
    // (InvoiceValue is in the account's own currency, e.g. KWD).
    p_amount: Number(String(invoice.InvoiceDisplayValue ?? '').match(/[\d.]+/)?.[0] ?? NaN) || null,
    p_currency: String(invoice.InvoiceDisplayValue ?? '').match(/[A-Z]{3}/)?.[0] ?? null,
  });
  if (error) {
    console.error('apply_premium_payment failed', error.message);
    return redirect(back, 'failed');
  }
  return redirect(back, 'success');
});
