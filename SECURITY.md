# Security notes — Retire Reimagined

## Key handling (read before touching any client code)

The browser bundle must only ever contain the **publishable (anon) key**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Both are read in `src/integrations/supabase/client.ts`, which is **auto-generated** —
do not edit it (changes are overwritten). These two values are designed to ship
publicly; Row Level Security is what protects the data.

**Never** place `SUPABASE_SERVICE_ROLE_KEY` (or any secret) in `src/`, in an
`import.meta.env.VITE_*` variable, or in any file that reaches the browser. The
service-role key bypasses RLS entirely, so a single leak exposes every user's
data. It belongs only in edge functions, read via `Deno.env.get(...)`.

Current service-role usage (all server-side, all via `Deno.env`):
`send-retention-email`, `seed-habits`, `generate-report`, and the shared
rate-limit guard `supabase/functions/_shared/rate-limit.ts`.

## Row Level Security

Every table in `public` has RLS enabled, and every policy is scoped
`TO authenticated` with ownership enforced via `auth.uid() = user_id` (or via
the parent row for `goal_milestones`). Telemetry tables (`client_errors`,
`page_events`) accept inserts from the row owner and restrict reads to admins
through `public.has_role(auth.uid(), 'admin')`.

`public.rate_limits` intentionally has **no policies** and no client grants:
RLS denies all client roles, and only the service-role guard can touch it.

## Rate limiting

Expensive edge functions call `checkRateLimit()` from
`supabase/functions/_shared/rate-limit.ts` immediately after authenticating the
caller. Counters are fixed windows in `public.rate_limits`, incremented
atomically by the backend-only `public.rate_limit_hit()` function. The guard
fails open if the counter store is unreachable, so an infrastructure blip never
blocks a legitimate user. Per-user allowances live in the `LIMITS` map.

Authentication endpoints (sign-in, sign-up, password reset) are protected by the
platform's built-in per-IP auth rate limits plus the auth email/hour cap.
