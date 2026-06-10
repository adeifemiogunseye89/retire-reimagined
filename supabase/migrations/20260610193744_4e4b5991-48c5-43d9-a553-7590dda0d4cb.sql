
-- ============ client_errors ============
CREATE TABLE public.client_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  route text,
  message text NOT NULL,
  stack text,
  user_agent text,
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX client_errors_created_at_idx ON public.client_errors(created_at DESC);
CREATE INDEX client_errors_message_idx ON public.client_errors(message);

GRANT INSERT ON public.client_errors TO anon, authenticated;
GRANT ALL ON public.client_errors TO service_role;
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert errors" ON public.client_errors
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read errors" ON public.client_errors
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ page_events ============
CREATE TABLE public.page_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  route text NOT NULL,
  tab text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX page_events_created_at_idx ON public.page_events(created_at DESC);
CREATE INDEX page_events_route_tab_idx ON public.page_events(route, tab);

GRANT INSERT ON public.page_events TO authenticated;
GRANT ALL ON public.page_events TO service_role;
ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own page events" ON public.page_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "admins read page events" ON public.page_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ Stale-report hashing ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS score_inputs_hash text;
ALTER TABLE public.ai_reports ADD COLUMN IF NOT EXISTS inputs_hash text;

CREATE OR REPLACE FUNCTION public.compute_score_inputs_hash()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.score_inputs_hash := md5(
    coalesce(NEW.age::text, '') || '|' ||
    coalesce(NEW.years_in_service::text, '') || '|' ||
    coalesce(NEW.grade_level, '') || '|' ||
    coalesce(NEW.sector, '') || '|' ||
    coalesce(NEW.current_salary::text, '') || '|' ||
    coalesce(NEW.pension_projection::text, '') || '|' ||
    coalesce(NEW.monthly_expenses::text, '') || '|' ||
    coalesce(NEW.dependents::text, '') || '|' ||
    coalesce(NEW.country, '') || '|' ||
    coalesce(NEW.currency, '') || '|' ||
    coalesce(NEW.region, '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_score_hash ON public.profiles;
CREATE TRIGGER profiles_score_hash
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.compute_score_inputs_hash();

-- Backfill existing rows
UPDATE public.profiles SET updated_at = updated_at;

-- ============ admin_observability RPC ============
CREATE OR REPLACE FUNCTION public.admin_observability(_days int DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'errors_total', (SELECT COUNT(*) FROM public.client_errors WHERE created_at >= now() - (_days || ' days')::interval),
    'errors_affected_users', (SELECT COUNT(DISTINCT user_id) FROM public.client_errors WHERE created_at >= now() - (_days || ' days')::interval AND user_id IS NOT NULL),
    'errors_by_day', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', day, 'count', c) ORDER BY day), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS c
        FROM public.client_errors
        WHERE created_at >= now() - (_days || ' days')::interval
        GROUP BY 1
      ) t
    ),
    'top_errors', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'message', message, 'count', c, 'users', u, 'sample_stack', s, 'last_seen', last_seen
      ) ORDER BY c DESC), '[]'::jsonb)
      FROM (
        SELECT message,
               COUNT(*) AS c,
               COUNT(DISTINCT user_id) AS u,
               MAX(stack) AS s,
               MAX(created_at) AS last_seen
        FROM public.client_errors
        WHERE created_at >= now() - (_days || ' days')::interval
        GROUP BY message
        ORDER BY c DESC
        LIMIT 10
      ) t
    ),
    'pageviews_total', (SELECT COUNT(*) FROM public.page_events WHERE created_at >= now() - '30 days'::interval),
    'tab_usage', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('tab', tab, 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (
        SELECT tab, COUNT(*) AS c
        FROM public.page_events
        WHERE created_at >= now() - '30 days'::interval
          AND route = '/dashboard' AND tab IS NOT NULL
        GROUP BY tab
      ) t
    ),
    'route_usage', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('route', route, 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (
        SELECT route, COUNT(*) AS c
        FROM public.page_events
        WHERE created_at >= now() - '30 days'::interval
        GROUP BY route
        ORDER BY c DESC LIMIT 20
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;
