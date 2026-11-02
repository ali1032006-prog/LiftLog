// Permanently deletes the signed-in user's account and all their data.
// The caller is identified from their own access token; nobody can delete another account.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Not signed in' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ error: 'Not signed in' }, 401);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Remove workouts and routines first so their exercise references are gone before the
  // profile cascade deletes the user's exercises.
  const routines = await admin.from('routines').delete().eq('user_id', user.id);
  if (routines.error) return json({ error: 'Could not delete routines' }, 500);
  const workouts = await admin.from('workouts').delete().eq('user_id', user.id);
  if (workouts.error) return json({ error: 'Could not delete workouts' }, 500);

  // Remove uploaded files (profile picture and workout photos) stored under the user's folder.
  for (const bucket of ['avatars', 'workout-photos']) {
    for (;;) {
      const { data: files } = await admin.storage.from(bucket).list(user.id, { limit: 100 });
      if (!files || files.length === 0) break;
      await admin.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`));
      if (files.length < 100) break;
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: 'Could not delete account' }, 500);
  return json({ deleted: true });
});
