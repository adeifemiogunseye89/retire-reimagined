## Goal

Stop flying blind: capture JS errors, page/tab usage, and edge-function activity inside Lovable Cloud, then surface them on an Admin → Observability page. Also fix the silent readiness-score drift by marking the report stale and auto-regenerating it when score-relevant profile fields change.

---

## Part 1 — Self-hosted observability

### New tables (RLS: insert allowed for anyone authenticated, read only by admins)

- `client_errors` — `id, user_id (nullable), route, message, stack, user_agent, app_version, created_at`
- `page_events` — `id, user_id, route, tab (nullable), session_id, created_at` (one row per route/tab view)

Both indexed on `created_at` + a partial index on `route` / `tab`.

### Client wiring

- `src/lib/telemetry.ts`: `logError(err, ctx)`, `logPageView(route)`, `logTabView(tab)`. Batched (5s flush) + sendBeacon on unload. Best-effort; never throws.
- `src/App.tsx`: wrap routes in an `ErrorBoundary` that calls `logError`; install `window.onerror` + `unhandledrejection` listeners once.
- `src/pages/Dashboard.tsx`: emit `logTabView(tab)` on tab change; emit `logPageView` on route mount via a small `useRouteTelemetry` hook.

### Admin → Observability page (`/admin/observability`)

Reuses the existing admin gating pattern (`useIsAdmin` + `has_role`). Three sections, all powered by a single `admin_observability(_days int)` SECURITY DEFINER RPC that returns JSON:

1. **Errors (last 7d)** — count, top 10 messages with sample stack + affected user count, line chart by day.
2. **Tab usage (last 30d)** — bar chart of `tab` from `page_events` where `route='/dashboard'`, plus route-level page-view totals.
3. **Edge functions (last 24h)** — table of function name, invocations, error rate, p95 latency. Backed by a second RPC that calls Supabase's built-in `function_edge_logs` view (queried server-side, admin-only). Each row links to a "View raw logs" drawer that fetches the latest 50 log lines for that function via a small admin-only edge function (`admin-edge-logs`) which the agent already uses internally.

Adds a sidebar link "Admin · Observability" next to the existing Events/Users/Analytics links.

### Privacy / cost guards

- Errors truncate `stack` to 4 KB and `message` to 1 KB.
- Page events deduped client-side: same `(route, tab)` within 30s = one row.
- Nightly `pg_cron` job prunes `client_errors > 90d` and `page_events > 180d`.

---

## Part 2 — Readiness report auto-regeneration on profile edits

### What counts as "score-relevant"

`age, years_in_service, grade_level, sector, current_salary, pension_projection, monthly_expenses, dependents, country, currency, region`. (Skills/interests/name do not.)

### Stale detection

- Add `profiles.score_inputs_hash text` and `ai_reports.inputs_hash text`.
- Trigger on `profiles` UPDATE: recompute `score_inputs_hash` from the columns above (stable JSON → md5).
- A report is **stale** when `profiles.score_inputs_hash != latest ai_reports.inputs_hash`.

### Auto-regenerate flow

- In `ProfileEdit.tsx`, after a successful save where any score-relevant field changed: call existing `generate-report` edge function in the background (fire-and-forget, toast "Updating your readiness score…"). The function already exists and writes to `ai_reports`; it just needs to also store the new `inputs_hash`.
- Realtime: `useDashboardData` already subscribes to user-scoped rows; add an `ai_reports` channel so the Report tab and Home hero number update the moment regeneration finishes.
- Failure path: if the edge call fails, surface a non-blocking "Report out of date — Retry" banner on the Report tab + Home hero (banner is also shown if the hash mismatch is ever detected on load, as a safety net).

### Edge-function change

`supabase/functions/generate-report/index.ts`: compute the same hash from the profile it reads and persist it on the new `ai_reports` row.

---

## Technical notes

- All new tables follow the GRANT → RLS → POLICY order. `client_errors` and `page_events` allow `INSERT` to `authenticated` (and `anon` for errors only, so pre-auth crashes are captured); `SELECT` is admin-only via `has_role(auth.uid(),'admin')`.
- `admin_observability` and `admin_edge_logs_query` are SECURITY DEFINER with `has_role` guard at the top, mirroring `admin_metrics` / `admin_list_users`.
- No external SDKs, no new secrets, no extra vendors. Everything stays inside Lovable Cloud.
- Existing `AdminAnalytics` page stays as the high-level KPI dashboard; the new Observability page is operational/debug-focused.

---

## Out of scope (call out, not building now)

- Source-mapped stack traces (Sentry territory).
- Per-idea / per-metric-log report regeneration — you chose profile-only.
- Session replay.
