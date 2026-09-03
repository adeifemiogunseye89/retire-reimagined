-- Performance indexes only. No schema, data, or policy changes.

-- Telemetry: owner/admin lookups filter by user_id, ordered by recency.
CREATE INDEX IF NOT EXISTS idx_client_errors_user_created
  ON public.client_errors (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_page_events_user_created
  ON public.page_events (user_id, created_at DESC);

-- admin_observability() groups page_events by route (and tab for /dashboard)
-- over a trailing time window.
CREATE INDEX IF NOT EXISTS idx_page_events_route_created
  ON public.page_events (route, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_page_events_tab_created
  ON public.page_events (tab, created_at DESC)
  WHERE tab IS NOT NULL;

-- Goals: listing is per-user ordered by target date; milestones join on goal_id.
CREATE INDEX IF NOT EXISTS idx_retirement_goals_user_target
  ON public.retirement_goals (user_id, target_date);

-- Tasks: filtered by owner + completion state, ordered by due date.
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed_due
  ON public.tasks (user_id, completed, due_date);

-- Project budgets: per-user recency listing (linked_idea_id used for joins).
CREATE INDEX IF NOT EXISTS idx_project_budgets_linked_idea
  ON public.project_budgets (linked_idea_id)
  WHERE linked_idea_id IS NOT NULL;

-- Documents: per-user listing ordered by upload time.
CREATE INDEX IF NOT EXISTS idx_user_documents_user_uploaded
  ON public.user_documents (user_id, uploaded_at DESC);