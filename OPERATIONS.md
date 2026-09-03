# Operations notes (Reignite)

Internal reference only. No user-facing behaviour is described here.

## Backups & recovery (managed Postgres / Lovable Cloud backend)

- **Automatic backups.** The managed Postgres instance takes daily physical
  backups with point-in-time recovery available on paid tiers. Retention depends
  on the plan (typically 7 days daily backups; PITR extends this to a rolling
  window). Nothing in the app code needs to run for this to happen.
- **Restore model.** A restore is a whole-database operation — you cannot restore
  a single table from the managed snapshot UI. To recover one table, restore the
  snapshot into a *separate* project/branch, export the rows you need, then copy
  them back with an INSERT ... ON CONFLICT migration.
- **Before any risky migration** (dropping a column, rewriting a table,
  bulk DELETE/UPDATE): take a manual logical dump first.
  ```bash
  pg_dump "$SUPABASE_DB_URL" --schema=public --no-owner > backup_$(date +%F).sql
  # single table:
  pg_dump "$SUPABASE_DB_URL" -t public.profiles --data-only > profiles_$(date +%F).sql
  ```
  `SUPABASE_DB_URL` is stored as a backend secret and must never be committed or
  logged.
- **What must never be lost.** `profiles` (assessment inputs + verified pension
  figures), `ai_reports`, `retirement_goals` + `goal_milestones`, `metric_logs`,
  `business_ideas`, `savings_plans`, `user_documents` rows *and* the matching
  objects in the `pension-documents` storage bucket. Storage objects are **not**
  covered by SQL dumps — export the bucket separately if migrating projects.
- **Recovery drill.** Once per quarter: restore the latest snapshot into a scratch
  project, sign in as a test user, and confirm the dashboard renders a report and
  a goal. A backup that has never been restored is not a backup.
- **Destructive-migration rule.** Every migration that deletes or rewrites user
  rows must state, in its description, what was backed up beforehand.

## Error monitoring

- Client errors land in `public.client_errors`; page/tab views in
  `public.page_events`. Both are insert-only for the owner and readable only by
  the owner or an admin.
- Review at `/admin/observability` (top errors, affected users, error-per-day,
  route/tab usage). Edge-function failures are visible in the backend function
  logs, not in `client_errors`.
- Errors carry `route`, `context` (a short tag such as `report:generate`),
  `app_version`, `user_agent` and a truncated stack. Keep the `context` tag stable
  so grouping in `admin_observability` stays meaningful.
