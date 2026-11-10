-- Per-user AI cost ceilings and a protected admin audit trail.
CREATE TABLE public.ai_usage_quotas (
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  daily_window date NOT NULL,
  monthly_window date NOT NULL,
  daily_count integer NOT NULL DEFAULT 0,
  monthly_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, function_name),
  CONSTRAINT ai_usage_quotas_nonnegative CHECK (daily_count >= 0 AND monthly_count >= 0)
);
GRANT ALL ON public.ai_usage_quotas TO service_role;
ALTER TABLE public.ai_usage_quotas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  target_resource text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read admin audit log"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX idx_admin_audit_log_actor_created ON public.admin_audit_log (actor_user_id, created_at DESC);

-- The database, not the browser, fixes the daily and monthly ceilings.
CREATE OR REPLACE FUNCTION public.consume_ai_usage_quota(_user_id uuid, _fn text)
RETURNS TABLE (
  allowed boolean,
  daily_used integer,
  daily_limit integer,
  monthly_used integer,
  monthly_limit integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'UTC')::date;
  this_month date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  day_cap integer;
  month_cap integer;
  current_daily integer;
  current_monthly integer;
BEGIN
  CASE _fn
    WHEN 'ai-coach' THEN day_cap := 100; month_cap := 2000;
    WHEN 'generate-report' THEN day_cap := 10; month_cap := 60;
    WHEN 'parse-pension-document' THEN day_cap := 10; month_cap := 50;
    WHEN 'budget-analysis' THEN day_cap := 30; month_cap := 300;
    WHEN 'inflation-analysis' THEN day_cap := 30; month_cap := 300;
    WHEN 'idea-viability' THEN day_cap := 40; month_cap := 300;
    ELSE RAISE EXCEPTION 'Unsupported AI function quota';
  END CASE;

  INSERT INTO public.ai_usage_quotas AS q
    (user_id, function_name, daily_window, monthly_window, daily_count, monthly_count)
  VALUES (_user_id, _fn, today, this_month, 0, 0)
  ON CONFLICT (user_id, function_name) DO UPDATE SET
    daily_window = CASE WHEN q.daily_window <> today THEN today ELSE q.daily_window END,
    daily_count = CASE WHEN q.daily_window <> today THEN 0 ELSE q.daily_count END,
    monthly_window = CASE WHEN q.monthly_window <> this_month THEN this_month ELSE q.monthly_window END,
    monthly_count = CASE WHEN q.monthly_window <> this_month THEN 0 ELSE q.monthly_count END,
    updated_at = now();

  SELECT q.daily_count, q.monthly_count
    INTO current_daily, current_monthly
    FROM public.ai_usage_quotas q
    WHERE q.user_id = _user_id AND q.function_name = _fn
    FOR UPDATE;

  IF current_daily >= day_cap OR current_monthly >= month_cap THEN
    RETURN QUERY SELECT false, current_daily, day_cap, current_monthly, month_cap;
    RETURN;
  END IF;

  UPDATE public.ai_usage_quotas q
    SET daily_count = q.daily_count + 1,
        monthly_count = q.monthly_count + 1,
        updated_at = now()
    WHERE q.user_id = _user_id AND q.function_name = _fn
    RETURNING q.daily_count, q.monthly_count INTO current_daily, current_monthly;

  RETURN QUERY SELECT true, current_daily, day_cap, current_monthly, month_cap;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_ai_usage_quota(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_usage_quota(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_ai_usage()
RETURNS TABLE (
  user_id uuid,
  email text,
  function_name text,
  daily_used integer,
  daily_limit integer,
  daily_remaining integer,
  monthly_used integer,
  monthly_limit integer,
  monthly_remaining integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT q.user_id, u.email::text, q.function_name,
    q.daily_count,
    CASE q.function_name
      WHEN 'ai-coach' THEN 100 WHEN 'generate-report' THEN 10
      WHEN 'parse-pension-document' THEN 10 WHEN 'budget-analysis' THEN 30
      WHEN 'inflation-analysis' THEN 30 WHEN 'idea-viability' THEN 40 END,
    GREATEST(0, CASE q.function_name
      WHEN 'ai-coach' THEN 100 WHEN 'generate-report' THEN 10
      WHEN 'parse-pension-document' THEN 10 WHEN 'budget-analysis' THEN 30
      WHEN 'inflation-analysis' THEN 30 WHEN 'idea-viability' THEN 40 END - q.daily_count),
    q.monthly_count,
    CASE q.function_name
      WHEN 'ai-coach' THEN 2000 WHEN 'generate-report' THEN 60
      WHEN 'parse-pension-document' THEN 50 WHEN 'budget-analysis' THEN 300
      WHEN 'inflation-analysis' THEN 300 WHEN 'idea-viability' THEN 300 END,
    GREATEST(0, CASE q.function_name
      WHEN 'ai-coach' THEN 2000 WHEN 'generate-report' THEN 60
      WHEN 'parse-pension-document' THEN 50 WHEN 'budget-analysis' THEN 300
      WHEN 'inflation-analysis' THEN 300 WHEN 'idea-viability' THEN 300 END - q.monthly_count),
    q.updated_at
  FROM public.ai_usage_quotas q
  LEFT JOIN auth.users u ON u.id = q.user_id
  WHERE q.daily_window = (now() AT TIME ZONE 'UTC')::date
     OR q.monthly_window = date_trunc('month', now() AT TIME ZONE 'UTC')::date
  ORDER BY q.updated_at DESC
  LIMIT 1000;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_ai_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ai_usage() TO authenticated, service_role;

-- Audit announcement changes using the authenticated actor from the DB request.
CREATE OR REPLACE FUNCTION public.audit_admin_announcement_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  resource_id text;
  event_title text;
  event_action text;
BEGIN
  IF actor IS NULL OR NOT public.has_role(actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF TG_OP = 'DELETE' THEN
    resource_id := OLD.id::text;
    event_title := OLD.title;
    event_action := 'announcement_delete';
  ELSIF TG_OP = 'INSERT' THEN
    resource_id := NEW.id::text;
    event_title := NEW.title;
    event_action := 'announcement_create';
  ELSE
    resource_id := NEW.id::text;
    event_title := NEW.title;
    event_action := 'announcement_update';
  END IF;

  INSERT INTO public.admin_audit_log (actor_user_id, action, target_resource, details, user_agent)
  VALUES (
    actor, event_action, resource_id,
    jsonb_build_object('title', event_title, 'operation', TG_OP),
    NULLIF(current_setting('request.headers', true)::jsonb ->> 'user-agent', '')
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER events_announcements_admin_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.events_announcements
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_announcement_change();

-- Role changes are already performed through this admin-only security-definer RPC.
CREATE OR REPLACE FUNCTION public.admin_set_role(
  _target_user uuid,
  _role public.app_role,
  _grant boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
  changed integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
    GET DIAGNOSTICS changed = ROW_COUNT;
  ELSE
    IF _role = 'admin'::public.app_role THEN
      SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin'::public.app_role;
      IF admin_count <= 1 THEN RAISE EXCEPTION 'cannot remove the last admin'; END IF;
    END IF;
    DELETE FROM public.user_roles WHERE user_id = _target_user AND role = _role;
    GET DIAGNOSTICS changed = ROW_COUNT;
  END IF;

  IF changed > 0 THEN
    INSERT INTO public.admin_audit_log (actor_user_id, action, target_user_id, target_resource, details)
    VALUES (
      auth.uid(),
      CASE WHEN _grant THEN 'role_grant' ELSE 'role_revoke' END,
      _target_user,
      'user_role',
      jsonb_build_object('role', _role::text, 'granted', _grant)
    );
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role, boolean) TO authenticated;
