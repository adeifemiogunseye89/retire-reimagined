
# Hardening Plan — Security → Performance → UX

Scoped to the actual schema. Note: there are no `retirement_plans`, `savings`, `goals`, or `contributions` tables in this project — the equivalents are `profiles`, `savings_plans`, `metric_logs`, `user_metrics`, `ai_reports`, `business_ideas`, `habits`, `tasks`, `project_budgets`, `chat_messages`. All already have RLS enabled with `auth.uid() = user_id` policies. Work below closes the real gaps found in the audit.

## Phase 1 — Security (do first)

**1.1 Tighten RLS role targeting (migration)**
Every user-data policy is currently granted to `{public}` (anon + authenticated). RLS still blocks anon because `auth.uid()` is null, but explicit scoping is defense-in-depth and passes the linter. Recreate policies on: `profiles`, `savings_plans`, `metric_logs`, `user_metrics`, `ai_reports`, `business_ideas`, `habits`, `habit_completions`, `tasks`, `project_budgets`, `chat_messages`, `lessons`, `live_sessions`, `worksheets` → `TO authenticated`. Also revoke `anon` GRANTs on these tables so PostgREST rejects unauthenticated calls at the transport layer, not just RLS.

**1.2 Fix `client_errors` insert policy**
It currently uses `WITH CHECK (true)` for `{anon, authenticated}` — a spam/abuse vector. Add a lightweight check: require either `auth.uid() = user_id` OR `user_id IS NULL`, and cap `message`/`stack` length via trigger (truncate to 2k / 8k).

**1.3 SECURITY DEFINER function lockdown (linter WARN 2–13)**
`admin_metrics`, `admin_list_users`, `admin_set_role`, `admin_observability` are executable by `public`. Revoke `EXECUTE ... FROM public, anon` and grant only to `authenticated` (the admin check inside already gates them, but this stops probing).

**1.4 Auth flow**
- Enable `password_hibp_enabled` via `configure_auth` (leaked-password check on signup/change).
- Keep email confirmation required (do NOT enable `auto_confirm_email`).
- `Auth.tsx`: raise `minLength` from 6 → 8 on the input to match the existing 8-char server-side check.

**1.5 Input validation with Zod**
- Add Zod schemas to the two user-writable edge functions that currently trust the body: `ai-coach`, `idea-viability`, `inflation-analysis`, `seed-habits`, `budget-analysis`, `generate-report`. Reject with 400 on parse failure; never echo raw error text back.
- Add Zod on the Assessment form submit path (`src/pages/Assessment.tsx`) — currency codes, country codes, non-negative numbers, bounded ages (18–100), bounded salary/expenses.
- Standardize a `safeErrorMessage()` helper that maps backend errors to friendly strings and logs the raw error only to telemetry — no stack traces or SQL fragments shown to users.

**1.6 Secrets hygiene**
Audit `src/` for any accidental key leaks — the current `client.ts` uses `VITE_SUPABASE_*` (publishable, safe). No changes expected; documented for the record.

## Phase 2 — Performance

**2.1 Indexes (migration)**
Add composite indexes matching real query patterns:
- `profiles(user_id)` unique
- `ai_reports(user_id, generated_at desc)`
- `business_ideas(user_id, created_at desc)`
- `metric_logs(user_id, logged_at desc)`, plus `(user_id, metric_type, logged_at desc)`
- `habits(user_id, active)`, `habit_completions(user_id, completed_on desc)`
- `tasks(user_id, status, due_date)`
- `chat_messages(user_id, created_at desc)`
- `page_events(user_id, created_at desc)`, `client_errors(user_id, created_at desc)`
- `events_announcements(is_active, publish_at desc)`

**2.2 Query caching**
Wrap dashboard reads in TanStack Query with `staleTime: 60_000` and per-tab query keys (`useDashboardData` currently refetches on every mount). Add `select` transforms so components subscribe to slices, not the whole payload.

**2.3 Kill N+1s**
Merge parallel dashboard fetches into a single `Promise.all` batch in `useDashboardData` and switch multi-table reads to a single `rpc` where they share a filter (`user_id`).

## Phase 3 — UX & reliability

- `ErrorBoundary`: add a "copy diagnostic id" button (already logs to telemetry with a UUID) instead of showing raw `error.message` to end users.
- Add skeletons on Dashboard tabs, Assessment steps, and Report generation. Replace bare "Loading…" strings.
- Retirement projection: extract math into `src/lib/retirement-math.ts` with a documented formula (real return, inflation-adjusted, monthly compounding) + unit tests in `src/test/retirement-math.test.ts`. Surface assumptions in a "How this is calculated" popover on the Plan/Protect tab.
- Mobile pass on Dashboard tab bar (currently overflows <380px) and Assessment step 3.

## Technical details

**Migration order:** one migration per phase (RLS re-scope, then indexes). Policies must be dropped and recreated to change role targeting — no `ALTER POLICY` for `TO` clause. GRANTs updated in same migration.

**Zod placement:** shared schemas in `supabase/functions/_shared/schemas.ts` re-declared per function (edge functions can't import across function dirs in Deno deploy — copy per function or use `npm:` shared package).

**No breaking API changes.** All edits are additive or drop-and-recreate with identical semantics.

## Deliverables order
1. Migration: RLS role scoping + `client_errors` tightening + SECURITY DEFINER revoke.
2. `configure_auth` (HIBP on).
3. Zod on edge functions + Assessment form.
4. Migration: indexes.
5. TanStack Query caching + `useDashboardData` batching.
6. Retirement math extraction + tests + assumptions popover.
7. Skeletons + mobile polish.

I'll show diffs for Phase 1 (security) first and pause for your review before Phase 2/3.
