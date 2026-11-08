// Retired: replaced by the `premium` function (action: 'checkout').
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

Deno.serve(() =>
  new Response(JSON.stringify({ error: 'This endpoint was replaced by the premium function', code: 'gone' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  }),
);
