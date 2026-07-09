
-- =========================================================================
-- 1.1 Re-scope user-data policies to `authenticated` and revoke anon grants
-- =========================================================================

-- Helper: rebuild the standard 4 owner policies for a user_id-owned table
-- We do this inline per table (no dynamic SQL) for clarity and auditability.

-- ai_reports
DROP POLICY IF EXISTS "Users can view own reports" ON public.ai_reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.ai_reports;
CREATE POLICY "Users can view own reports" ON public.ai_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports" ON public.ai_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
REVOKE ALL ON public.ai_reports FROM anon;

-- business_ideas
DROP POLICY IF EXISTS "Users can view own ideas" ON public.business_ideas;
DROP POLICY IF EXISTS "Users can insert own ideas" ON public.business_ideas;
DROP POLICY IF EXISTS "Users can update own ideas" ON public.business_ideas;
DROP POLICY IF EXISTS "Users can delete own ideas" ON public.business_ideas;
CREATE POLICY "Users can view own ideas" ON public.business_ideas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ideas" ON public.business_ideas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ideas" ON public.business_ideas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own ideas" ON public.business_ideas
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.business_ideas FROM anon;

-- chat_messages
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.chat_messages;
CREATE POLICY "Users can view own chat messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat messages" ON public.chat_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.chat_messages FROM anon;

-- habit_completions
DROP POLICY IF EXISTS "Users can view own completions" ON public.habit_completions;
DROP POLICY IF EXISTS "Users can insert own completions" ON public.habit_completions;
DROP POLICY IF EXISTS "Users can delete own completions" ON public.habit_completions;
CREATE POLICY "Users can view own completions" ON public.habit_completions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own completions" ON public.habit_completions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own completions" ON public.habit_completions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.habit_completions FROM anon;

-- habits
DROP POLICY IF EXISTS "Users can view own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can insert own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can update own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can delete own habits" ON public.habits;
CREATE POLICY "Users can view own habits" ON public.habits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habits" ON public.habits
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON public.habits
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON public.habits
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.habits FROM anon;

-- lessons
DROP POLICY IF EXISTS "Users can view own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Users can insert own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Users can update own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Users can delete own lessons" ON public.lessons;
CREATE POLICY "Users can view own lessons" ON public.lessons
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lessons" ON public.lessons
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lessons" ON public.lessons
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own lessons" ON public.lessons
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.lessons FROM anon;

-- live_sessions
DROP POLICY IF EXISTS "Users can view own live sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Users can insert own live sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Users can update own live sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Users can delete own live sessions" ON public.live_sessions;
CREATE POLICY "Users can view own live sessions" ON public.live_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own live sessions" ON public.live_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own live sessions" ON public.live_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own live sessions" ON public.live_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.live_sessions FROM anon;

-- metric_logs
DROP POLICY IF EXISTS "Users can view own metric logs" ON public.metric_logs;
DROP POLICY IF EXISTS "Users can insert own metric logs" ON public.metric_logs;
DROP POLICY IF EXISTS "Users can delete own metric logs" ON public.metric_logs;
CREATE POLICY "Users can view own metric logs" ON public.metric_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own metric logs" ON public.metric_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own metric logs" ON public.metric_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.metric_logs FROM anon;

-- profiles
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='profiles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
REVOKE ALL ON public.profiles FROM anon;

-- project_budgets
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='project_budgets' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_budgets', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Users can view own budgets" ON public.project_budgets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON public.project_budgets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON public.project_budgets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON public.project_budgets
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.project_budgets FROM anon;

-- savings_plans
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='savings_plans' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.savings_plans', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Users can view own savings plans" ON public.savings_plans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own savings plans" ON public.savings_plans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own savings plans" ON public.savings_plans
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own savings plans" ON public.savings_plans
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.savings_plans FROM anon;

-- tasks
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='tasks' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.tasks FROM anon;

-- user_metrics
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='user_metrics' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_metrics', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Users can view own metrics" ON public.user_metrics
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own metrics" ON public.user_metrics
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own metrics" ON public.user_metrics
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
REVOKE ALL ON public.user_metrics FROM anon;

-- worksheets
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='worksheets' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.worksheets', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Users can view own worksheets" ON public.worksheets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own worksheets" ON public.worksheets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own worksheets" ON public.worksheets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own worksheets" ON public.worksheets
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.worksheets FROM anon;

-- user_roles (auth-only read; no anon)
REVOKE ALL ON public.user_roles FROM anon;

-- =========================================================================
-- 1.2 client_errors: tighten insert + cap oversized text via trigger
-- =========================================================================

DROP POLICY IF EXISTS "anyone can insert errors" ON public.client_errors;
CREATE POLICY "Auth users log own errors, anon may log without user_id"
  ON public.client_errors
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

CREATE OR REPLACE FUNCTION public.truncate_client_error_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.message IS NOT NULL AND length(NEW.message) > 2000 THEN
    NEW.message := left(NEW.message, 2000);
  END IF;
  IF NEW.stack IS NOT NULL AND length(NEW.stack) > 8000 THEN
    NEW.stack := left(NEW.stack, 8000);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_truncate_client_error_fields ON public.client_errors;
CREATE TRIGGER trg_truncate_client_error_fields
  BEFORE INSERT ON public.client_errors
  FOR EACH ROW EXECUTE FUNCTION public.truncate_client_error_fields();

-- =========================================================================
-- 1.3 Lock down SECURITY DEFINER admin functions
-- =========================================================================

REVOKE ALL ON FUNCTION public.admin_metrics()               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_observability(integer)  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_users(integer, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_role(uuid, app_role, boolean)  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_metrics()               TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_observability(integer)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean)  TO authenticated;

-- event_is_visible is a helper used by RLS policies (invoker context via policy),
-- but it's SECURITY DEFINER and should not be callable directly by anon.
REVOKE ALL ON FUNCTION public.event_is_visible(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_is_visible(uuid, uuid) TO authenticated;
