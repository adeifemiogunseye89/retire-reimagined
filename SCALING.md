# Scaling Readiness — Reignite / Retire Reimagined

Preparation notes only. Nothing here changes current behaviour; it describes the
path to take as usage grows, and records the safe guards already in the code.

## 1. Where we are today

- Single-region Lovable Cloud (Supabase) project: Postgres + Auth + Storage + Edge Functions.
- React 18 + Vite SPA served as static assets from Lovable hosting (global CDN).
- Client talks to Postgres through PostgREST (HTTP), not raw connections, so
  there is no app-managed connection pool to tune.
- React Query defaults (`src/App.tsx`): 60s `staleTime`, 5m `gcTime`, no refetch
  on window focus, refetch on reconnect, 1 retry.
- Per-user data is RLS-scoped and indexed on `user_id` (+ ordering columns).
- Expensive Edge Functions are rate limited per user via `rate_limits` and
  `supabase/functions/_shared/rate-limit.ts` (fail-open).

## 2. Scaling path

### 2.1 Database / backend plan upgrades

Trigger points, in order — upgrade one dimension at a time and re-measure:

| Signal | Action |
| --- | --- |
| Data disk > ~70% used | Increase **database disk size** (independent of compute) |
| Memory or connection saturation high, slow queries rising | Increase **database server (compute) size** |
| Bursty traffic, many short-lived clients | Ensure all traffic goes through PostgREST/PgBouncer (already true); avoid direct `postgres://` clients from serverless code |
| Steady growth beyond free/entry tier limits (bandwidth, storage, MAU, function invocations) | Move to the next paid tier before hitting hard caps |
| Need point-in-time recovery / longer retention | Paid tier + PITR (see `OPERATIONS.md`) |

Check health with the built-in database health snapshot (DB/PgBouncer status,
connection saturation, DB size, WAL size, restarts, deadlocks, OOM kills) rather
than ad-hoc `pg_stat_activity` queries.

**Do not** shard, add read replicas, or go multi-region until a single upgraded
instance is demonstrably saturated. Read replicas come first (read-heavy
dashboards benefit most), multi-region last.

### 2.2 Frontend hosting scaling

- Static build already scales horizontally on CDN; no server to scale.
- Keep the bundle lean: prefer route-level lazy loading for admin pages and
  heavy tabs if the main chunk grows past ~500 kB gzipped.
- Long-cache hashed assets (default with Vite output), keep `index.html` short-cached.
- Add a custom domain before heavy marketing traffic so CDN cache keys stay stable.
- Images: keep exported assets compressed; move large media to Storage + CDN
  rather than the bundle.

### 2.3 Handling increased concurrent users

1. **Cache more, fetch less.** Dashboard payload is one batched `useQuery`
   (`["dashboard", userId]`). New screens should follow that pattern instead of
   per-component fetch waterfalls.
2. **Bound every list query.** All per-user lists now carry an explicit `.limit()`
   safety cap (see §3) so one heavy account can't produce huge responses.
3. **Realtime discipline.** Subscriptions are per-user filtered. Realtime
   connections are a plan-limited resource — if concurrency climbs, drop
   subscriptions on low-value tables and rely on `staleTime` + refetch.
4. **Edge Functions.** They scale automatically, but AI calls are the cost and
   latency bottleneck; keep the per-user rate limits and prefer one call with
   richer context over several small calls.
5. **Write amplification.** Report regeneration and telemetry inserts are the
   highest-volume writes. If write load grows, batch telemetry client-side and
   trim `client_errors` / `page_events` with a scheduled retention job.
6. **Load testing before events.** Rehearse with a realistic script (sign in,
   load dashboard, one AI call) at 10× expected concurrency and watch DB
   connection saturation and function error rates.

### 2.4 Deliberately deferred

Not implemented, on purpose: multi-region deployment, load balancers, read
replicas, external APM vendors, queueing/worker tiers. Revisit only when the
metrics above justify them.

## 3. Safe guards added during this pass

Bounded page sizes on previously unbounded per-user queries (limits are far above
realistic user data volumes, so the UI is unchanged):

- `business_ideas` in the dashboard payload — 100
- `retirement_goals` — 100; `goal_milestones` — 500
- `tasks` — 300
- `habits` — 100; `habit_completions` (already 120-day windowed) — 2000

## 4. Verification checklist

- [ ] Dashboard loads with all tabs rendering as before (Home, Metrics, Actions, Goals, Income Reinvention, Plan & Protect, Tips).
- [ ] Goals show milestones; tasks list and habit streaks render unchanged.
- [ ] Announcements carousel still shows targeted announcements.
- [ ] AI coach and report generation still respond.
- [ ] Typecheck passes.
- [ ] No new network requests or console errors on the dashboard.
