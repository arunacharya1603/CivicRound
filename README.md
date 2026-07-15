# CivicRound

CivicRound is a production-oriented one-to-one political video debate product.
Guests authenticate anonymously, choose a motion and stance, select a one- or
two-minute format, match with the opposing position, and enter an authorized
LiveKit room with a shared server clock.

## Stack

- Next.js 16, React 19, and TypeScript
- Tailwind CSS 4 and shadcn-style Radix primitives
- TanStack Query
- Supabase anonymous authentication, PostgreSQL, RLS, and transactional RPCs
- LiveKit Cloud for real-time media
- Vercel production deployment, with vinext retained for the local Codex preview

## Environment

Create `.env.local` from `.env.example`.

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key
- `NEXT_PUBLIC_LIVEKIT_URL`: LiveKit Project URL beginning with `wss://`
- `LIVEKIT_API_KEY`: server-only LiveKit API key
- `LIVEKIT_API_SECRET`: server-only LiveKit API secret
- `NEXT_PUBLIC_ENABLE_DEMO_MODE`: `false` in production

Never expose the LiveKit API secret through a `NEXT_PUBLIC_` variable.

## Database

Run the migration in
`supabase/migrations/202607150001_civicround.sql` through the Supabase SQL
Editor or CLI. It installs:

- authenticated guest profiles and acceptance timestamps
- atomic opposing-stance matchmaking with polling, expiry, and cancellation
- single-use invitation codes
- room participants, speaker order, readiness, and lifecycle timestamps
- persistent reports, feedback, moderator hooks, and account restrictions
- RLS policies and narrowly scoped security-definer RPCs

Anonymous sign-ins must be enabled in Supabase Authentication settings.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
npm test
npm run test:backend
npm run build:vercel
```

`npm run test:backend` uses `.env.local` and a running app at
`http://localhost:3000`. It creates disposable anonymous test participants and
verifies the live Supabase and LiveKit contract without printing credentials.

## Production behavior

- Demo fallback is disabled when `NEXT_PUBLIC_ENABLE_DEMO_MODE=false`.
- The first queued user polls until the second participant creates their shared room.
- Invitation claiming is atomic and restricted to one opponent.
- LiveKit tokens require a valid Supabase session and database room membership.
- Both users must be connected before PostgreSQL sets the shared start time.
- Reports identify the real opponent UUID and are rate-limited.
- Early room departure cancels the session; normal timer completion is idempotent.
