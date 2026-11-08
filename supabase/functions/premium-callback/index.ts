// Retired: replaced by the `premium` function. Forwards MyFatoorah redirects for invoices that
// were created before the switch.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

Deno.serve((req: Request) => {
  const query = new URL(req.url).search;
  return new Response(null, {
    status: 302,
    headers: { Location: `${Deno.env.get('SUPABASE_URL')}/functions/v1/premium${query}` },
  });
});
