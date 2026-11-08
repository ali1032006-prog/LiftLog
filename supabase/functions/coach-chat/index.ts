// AI coach chat. Sends the signed-in person's message to free OpenRouter models, with a short
// summary of their recent workouts, and stores both sides of the conversation.
// The OpenRouter key lives only in this function's secrets (OPENROUTER_API_KEY).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const DAILY_LIMIT = 20;
const HISTORY_MESSAGES = 12;
const WORKOUT_DAYS = 28;
// Only :free models, so a fallback never bills the account.
const MODELS = ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3.5-lightning:free', 'openrouter/free'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

type SetRow = { weight_kg: number | null; reps: number | null; completed: boolean; position: number };
type WorkoutRow = {
  title: string;
  started_at: string;
  duration_seconds: number | null;
  workout_exercises: { position: number; weight_unit: string; exercise: { name: string } | null; sets: SetRow[] }[];
};

function formatWeight(kg: number | null, unit: string): string {
  if (kg == null) return '';
  return unit === 'lb' ? `${Math.round(kg * 2.20462 * 10) / 10} lb` : `${Math.round(kg * 10) / 10} kg`;
}

/** Compact, model-friendly summary of recent workouts (newest first). */
function summarize(workouts: WorkoutRow[]): string {
  if (workouts.length === 0) return 'No workouts logged in the last 4 weeks.';
  return workouts.map((w) => {
    const day = w.started_at.slice(0, 10);
    const mins = w.duration_seconds ? `, ${Math.round(w.duration_seconds / 60)} min` : '';
    const exercises = [...w.workout_exercises].sort((a, b) => a.position - b.position).map((we) => {
      const sets = [...we.sets].filter((s) => s.completed).sort((a, b) => a.position - b.position)
        .map((s) => [formatWeight(s.weight_kg, we.weight_unit), s.reps != null ? `${s.reps} reps` : ''].filter(Boolean).join(' x '))
        .filter(Boolean);
      return `  - ${we.exercise?.name ?? 'Exercise'}: ${sets.length ? sets.join('; ') : 'no completed sets'}`;
    });
    return `${day} "${w.title}"${mins}\n${exercises.join('\n')}`;
  }).join('\n');
}

/** Recent body weight entries (newest first) and goal, for weight questions. */
function weightSummary(rows: { logged_on: string; weight_kg: number }[], goalKg: number | null): string {
  const goal = goalKg != null ? `Goal weight: ${Number(goalKg)} kg.` : 'No goal weight set.';
  if (rows.length === 0) return `No body weight logged. ${goal}`;
  return `${rows.map((r) => `${r.logged_on}: ${Number(r.weight_kg)} kg`).join(', ')}. ${goal}`;
}

function systemPrompt(name: string, workouts: string, weight: string, lang: string): string {
  return [
    `You are LiftLog Coach, a friendly, practical strength-training coach inside the LiftLog workout app. You are talking with ${name}.`,
    'Give specific, actionable advice on training, exercise technique, programming, progression, recovery and general nutrition.',
    'Use their recent workouts below when relevant: point out progress, suggest next weights or reps, and spot imbalances.',
    'Keep answers short: a few sentences or a short list using "- " bullets. Plain text only: no tables, headings or bold markers.',
    'You are not a doctor. For pain, injury, medical conditions or eating disorders, say so briefly and recommend seeing a qualified professional.',
    'Stay on fitness and health topics; politely decline anything unrelated.',
    lang === 'ar' ? 'Always reply in Arabic.' : "Reply in the language of the person's message.",
    '',
    `Their workouts from the last ${WORKOUT_DAYS} days (newest first):`,
    workouts,
    '',
    'Their body weight log (newest first):',
    weight,
  ].join('\n');
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
  const { data: userData, error: userError } = await asUser.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ error: 'Not signed in', code: 'auth' }, 401);

  const body = await req.json().catch(() => ({}));
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const lang = body.lang === 'ar' ? 'ar' : 'en';
  if (!message) return json({ error: 'Message is empty', code: 'empty' }, 400);
  if (message.length > 2000) return json({ error: 'Message is too long', code: 'too_long' }, 400);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // The coach is a LiftLog Premium feature.
  const { data: premium, error: premiumError } = await admin.rpc('has_premium', { p_user_id: user.id });
  if (premiumError) return json({ error: 'Could not check your plan' }, 500);
  if (!premium) return json({ error: 'The coach is part of LiftLog Premium', code: 'premium' }, 402);

  // Rolling 24-hour limit on the person's own messages.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin.from('coach_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('role', 'user').gte('created_at', since);
  if (countError) return json({ error: 'Could not check your message limit' }, 500);
  const used = count ?? 0;
  if (used >= DAILY_LIMIT) return json({ error: 'Daily limit reached', code: 'limit', remaining: 0, limit: DAILY_LIMIT }, 429);

  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) return json({ error: 'The coach is not set up yet', code: 'not_configured' }, 503);

  const workoutsSince = new Date(Date.now() - WORKOUT_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: profile }, { data: history }, { data: workouts }, { data: weights }, { data: goal }] = await Promise.all([
    admin.from('profiles').select('username, display_name').eq('id', user.id).single(),
    admin.from('coach_messages').select('role, content').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(HISTORY_MESSAGES),
    admin.from('workouts')
      .select('title, started_at, duration_seconds, workout_exercises(position, weight_unit, exercise:exercises(name), sets(weight_kg, reps, completed, position))')
      .eq('user_id', user.id).not('finished_at', 'is', null).gte('started_at', workoutsSince)
      .order('started_at', { ascending: false }).limit(15),
    admin.from('body_weights').select('logged_on, weight_kg').eq('user_id', user.id)
      .order('logged_on', { ascending: false }).limit(10),
    admin.from('weight_goals').select('goal_kg').eq('user_id', user.id).maybeSingle(),
  ]);

  const name = profile?.display_name || profile?.username || 'the lifter';
  const messages = [
    { role: 'system', content: systemPrompt(name, summarize((workouts ?? []) as unknown as WorkoutRow[]), weightSummary(weights ?? [], goal?.goal_kg ?? null), lang) },
    ...[...(history ?? [])].reverse().map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  let reply = '';
  let model = '';
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liftlog-brown-zeta.vercel.app',
        'X-Title': 'LiftLog',
      },
      body: JSON.stringify({ models: MODELS, messages, max_tokens: 700, temperature: 0.6 }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error('openrouter error', res.status, JSON.stringify(data?.error ?? data).slice(0, 500));
      return json({ error: 'The coach is busy right now. Try again in a minute.', code: 'upstream' }, 502);
    }
    reply = String(data?.choices?.[0]?.message?.content ?? '').trim();
    model = String(data?.model ?? '');
  } catch (e) {
    console.error('openrouter fetch failed', String(e));
    return json({ error: 'The coach is busy right now. Try again in a minute.', code: 'upstream' }, 502);
  }
  if (!reply) return json({ error: 'The coach is busy right now. Try again in a minute.', code: 'upstream' }, 502);
  reply = reply.slice(0, 8000);

  // Save only after a successful reply, so failures don't use up the daily limit.
  const now = Date.now();
  const { error: saveError } = await admin.from('coach_messages').insert([
    { user_id: user.id, role: 'user', content: message, created_at: new Date(now).toISOString() },
    { user_id: user.id, role: 'assistant', content: reply, created_at: new Date(now + 1).toISOString() },
  ]);
  if (saveError) console.error('save failed', saveError.message);

  return json({ reply, model, remaining: Math.max(0, DAILY_LIMIT - used - 1), limit: DAILY_LIMIT });
});
