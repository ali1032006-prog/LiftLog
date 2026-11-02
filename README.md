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

```bash
npm run deploy:web      # expo export → dist, then vercel deploy --prod
```

Live: https://liftlog-brown-zeta.vercel.app (Vercel project `liftlog`). The `.env` values are baked into
the static build at export time, so set them locally before deploying.

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
