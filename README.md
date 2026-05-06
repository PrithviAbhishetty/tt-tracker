# TT Tracker

A Progressive Web App for tracking in-person table tennis matches and producing an ELO leaderboard.

- Singles, doubles, and tournaments (round-robin + single elimination)
- Auth via Supabase (Google OAuth + email magic link)
- Mix of registered users and "guest" players
- Offline-friendly: queue matches courtside and sync when reconnected
- Installable to a phone home screen — no app store

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Supabase: Postgres, Auth, RLS
- Serwist for the service worker
- IndexedDB (`idb`) for the offline queue
- Recharts for ELO history

## Local development

You need [Docker](https://www.docker.com/) (for the Supabase local stack) and Node 20+.

### 1. Install dependencies

```bash
npm install
```

### 2. Start Supabase locally

```bash
npx supabase start
```

This boots Postgres + Auth + Studio. It also prints the API URL and anon/service-role keys — copy those into `.env.local`.

```bash
cp .env.local.example .env.local
# edit .env.local with the values from `supabase start`
```

Apply migrations:

```bash
npx supabase db reset
```

This runs `supabase/migrations/0001_init.sql` (schema + RLS) and `0002_elo_functions.sql` (ELO).

### 3. Generate icons (one-time)

```bash
npm run icons
```

Creates `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, and `apple-touch-icon.png` from `public/icons/icon.svg`.

### 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000.

> The service worker is **disabled in development** so it doesn't interfere with HMR. To test PWA install + offline behavior, run `npm run build && npm start` and visit on a real device (PWAs require HTTPS — use a tunnel like Cloudflare Tunnel or ngrok for phone testing).

## Deploy

### Supabase (production)

1. Create a project at https://supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_init.sql` then `0002_elo_functions.sql`.
3. Auth → Providers: enable **Google** (configure OAuth credentials at https://console.cloud.google.com/) and **Email** (Magic link is on by default).
4. Auth → URL Configuration: add `https://<your-vercel-domain>/auth/callback` to the redirect URLs allow list.

### Vercel

1. Push this repo to GitHub.
2. Import it at https://vercel.com/new.
3. Set environment variables (Project → Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL` — from your Supabase project
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` — server-only, never client-side
   - `NEXT_PUBLIC_SITE_URL` — your Vercel URL
4. Deploy.

Both the Vercel and Supabase free tiers are sufficient for personal/group use. Note that the Supabase free tier auto-pauses after ~1 week of inactivity.

## Installing as a PWA

- **Android Chrome / desktop Chrome / Edge**: an "Install" button appears in the top nav once the manifest is detected.
- **iOS Safari**: tap the Share button → **Add to Home Screen**. Safari does not support a programmatic install prompt; the in-app "Install" button shows instructions instead.

## How ELO works

Standard ELO with a tiered K-factor (FIDE-style):

- `K = 40` while a player has fewer than 10 games (provisional)
- `K = 32` while fewer than 30 games
- `K = 16` thereafter

For doubles, team rating = arithmetic mean of partners; the resulting delta is applied equally to both teammates. Margin of victory does **not** affect ELO — only wins and losses.

Matches are stored as immutable facts (`matches` + `match_players` tables) with a client-supplied `played_at` timestamp. Player ratings (`players.elo_rating`) are a derived materialized value. When a backdated match is synced from offline, the server recomputes ratings forward from that point — see `recalculate_elo_since` in `0002_elo_functions.sql`.

For a full reset: `select recalculate_all_elo();` in the Supabase SQL editor (service role).

## Offline behaviour

- Matches recorded while offline (or when the network request fails) are written to IndexedDB and shown in a "waiting to sync" badge.
- On reconnect — and on every tab focus — the queue is flushed to `/api/matches`.
- Each match has a client-generated UUID; the server upserts on it, so duplicate sync attempts are no-ops.
- iOS Safari purges IndexedDB after ~7 days of PWA inactivity. Don't treat the queue as durable storage; sync regularly.

## Layout

```
app/
  page.tsx                          leaderboard
  sign-in/                          Google + magic-link auth
  auth/callback/route.ts            OAuth/email callback
  record/{singles,doubles}          match recording
  players/{,[id]}                   list + profile (with ELO chart)
  tournaments/{,new,[id]}           list, create, bracket/grid
  api/matches{,/sync}/route.ts      idempotent match insert + bulk sync
  api/tournaments/route.ts          tournament + bracket generation
  api/players/route.ts              add guest
  manifest.ts                       Web App Manifest
  sw.ts                             Serwist service worker
  offline/                          SW fallback page

components/                         UI
lib/supabase/                       SSR clients (browser/server/service)
lib/offline/                        IndexedDB queue + sync
lib/tournament/                     bracket + round-robin generators
supabase/migrations/                schema + ELO SQL
proxy.ts                            session refresh + auth gate
```
