# LiftLog

A Hevy-style workout tracker: log exercises, sets and reps with a rest timer, save routines,
follow friends and copy their workouts. One Expo codebase for iOS, Android and web; Supabase
(Postgres + Auth + Row Level Security) as the backend.

## Stack

- **Expo SDK 58 / React Native** with Expo Router (`src/app`)
- **Supabase**: tables, RLS policies and SQL functions in `supabase/migrations`
- `@tanstack/react-query` for server data, `zustand` (persisted) for the in-progress workout

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your Supabase project URL and publishable key.
3. Apply the SQL in `supabase/migrations` to your project (in order), or use the Supabase MCP / CLI.
4. In the Supabase dashboard → Authentication → Providers → Email, turn **Confirm email** off for
   local development (otherwise new accounts must click the confirmation link before signing in).

## Run

```bash
npx expo start          # press w for web, or scan the QR code with Expo Go
npx expo start --web    # web only
npx tsc --noEmit        # typecheck
npx eslint src          # lint
```

## App structure

| Route | Purpose |
|---|---|
| `(auth)/login`, `(auth)/register` | Email + password auth, username picked at sign-up |
| `(tabs)/index` | Home feed: your workouts + people you follow |
| `(tabs)/workout` | Start an empty workout, routines list |
| `(tabs)/account` | Your profile: workouts, followers, following |
| `workout/active` | Live workout logger with rest timer |
| `workout/[id]` | Workout detail; "Save as routine" copies it to your routines |
| `routine/[id]` | Routine editor (`new` creates one) |
| `user/[id]`, `.../followers`, `.../following` | Other users' profiles and follow lists |
| `search` | Username search + suggested users |
| `settings` | Display name, bio, kg/lb unit, sign out |

Weights are stored in kg and converted to the user's unit on display.

## Deploy (web)

The Vercel project `liftlog` is connected to this GitHub repo: every push to `main` builds and
deploys to production automatically, and other branches get preview deployments. Vercel runs
`npm run build:web` using the `EXPO_PUBLIC_SUPABASE_*` environment variables set in the project.

To deploy without pushing (same remote build):

```bash
npm run deploy:web
```

Live: https://liftlog-brown-zeta.vercel.app

## Social sign-in (Google, Apple, GitHub)

The login and register screens show a "Continue with …" button for each provider that is
enabled in Supabase, and hide the rest. To enable one:

1. Create OAuth credentials with the provider (Google Cloud Console, Apple Developer, or GitHub
   Developer Settings). Use this callback URL:
   `https://rgqzsndhttuektlykhps.supabase.co/auth/v1/callback`
2. In Supabase → Authentication → Sign In / Providers, turn the provider on and paste the
   client ID and secret.
3. In Supabase → Authentication → URL Configuration, set the Site URL to
   `https://liftlog-brown-zeta.vercel.app` and add these redirect URLs:
   - `https://liftlog-brown-zeta.vercel.app`
   - `http://localhost:8081`
   - `liftlog://auth-callback` (the installed app)
   - `exp://**` (Expo Go during development)

## Edge Functions

- `login-with-username`: signs in with a username without exposing emails to the client.
- `delete-account`: permanently deletes the caller's account and data.
- `coach-chat`: the AI coach on the Coach tab. Sends the person's message, their recent chat and a summary of their last 4 weeks of workouts to free OpenRouter models, then stores both sides in `coach_messages`. Limited to 20 messages per person per 24 hours.

## LiftLog Premium

Premium ($4.99/month or $49.99/year) unlocks the AI coach, the Weight tab (weight log, goal,
trend chart and tips) and unlimited routines (the free plan saves 4). A popup lists these the
first time each person signs in; it can be reopened from Settings → LiftLog Premium.

- Who has Premium lives in the `subscriptions` table. Only the server can write it, so the
  database, the coach function and the routine limit all trust it.
- Payments go through **MyFatoorah** as one-time invoices: paying adds 1 month or 1 year
  (from the later of today or the current end date). There is no automatic renewal yet.
  `premium-checkout` creates the invoice; MyFatoorah sends the customer to `premium-callback`,
  which re-checks the payment with MyFatoorah (`GetPaymentStatus`), records the invoice once in
  `subscription_payments`, extends `subscriptions`, and sends them back to the app.
- Setup: in Supabase → Edge Functions → Secrets, add `MYFATOORAH_API_KEY` (your MyFatoorah
  token). It uses the sandbox (`https://apitest.myfatoorah.com`) by default; for live payments
  also add `MYFATOORAH_BASE_URL` with your country's live API URL and use your live token.
- To give someone Premium by hand (for testing), run in the SQL editor:

  ```sql
  insert into public.subscriptions (user_id, plan, current_period_end, provider)
  select id, 'yearly', now() + interval '1 year', 'manual' from public.profiles where username = 'their_username'
  on conflict (user_id) do update set status = 'active', current_period_end = excluded.current_period_end;
  ```

## AI coach setup

The coach uses only free OpenRouter models (`:free`), so it never charges your OpenRouter account.

1. Create a key at [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys).
2. In Supabase, open **Edge Functions → Secrets** and add `OPENROUTER_API_KEY` with that key.

OpenRouter allows 50 free-model requests per day across your whole account, or 1,000 per day once you have bought at least $10 of credits (the credits are not spent by free models). Until the key is set, the Coach tab shows "The coach is not set up yet."
