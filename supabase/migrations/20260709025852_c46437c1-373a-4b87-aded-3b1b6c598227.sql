
CREATE INDEX IF NOT EXISTS idx_ai_reports_user_generated
  ON public.ai_reports (user_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_ideas_user_created
  ON public.business_ideas (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_habits_user
  ON public.habits (user_id);

CREATE INDEX IF NOT EXISTS idx_project_budgets_user_created
  ON public.project_budgets (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_metric_logs_user_type_time
  ON public.metric_logs (user_id, metric_type, logged_at DESC);
