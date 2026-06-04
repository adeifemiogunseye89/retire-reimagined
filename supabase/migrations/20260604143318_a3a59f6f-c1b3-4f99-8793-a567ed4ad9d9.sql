-- ============================================================
-- Events: scheduling + targeting
-- ============================================================
ALTER TABLE public.events_announcements
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS target_countries text[],
  ADD COLUMN IF NOT EXISTS target_languages text[],
  ADD COLUMN IF NOT EXISTS target_roles app_role[];

CREATE INDEX IF NOT EXISTS idx_events_active_publish
  ON public.events_announcements (is_active, publish_at);

-- Backfill publish_at from existing date so historical rows remain visible
UPDATE public.events_announcements SET publish_at = date WHERE publish_at IS NULL;

-- Visibility helper. SECURITY DEFINER so it can read user_roles without
-- triggering recursive RLS on user_roles.
CREATE OR REPLACE FUNCTION public.event_is_visible(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e public.events_announcements%ROWTYPE;
  p_country text;
  p_language text;
BEGIN
  SELECT * INTO e FROM public.events_announcements WHERE id = _event_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF e.is_active IS DISTINCT FROM true THEN RETURN false; END IF;
  IF e.publish_at IS NOT NULL AND e.publish_at > now() THEN RETURN false; END IF;

  SELECT country, language INTO p_country, p_language
  FROM public.profiles WHERE user_id = _user_id;

  IF e.target_countries IS NOT NULL
     AND array_length(e.target_countries, 1) > 0
     AND (p_country IS NULL OR NOT (p_country = ANY (e.target_countries))) THEN
    RETURN false;
  END IF;

  IF e.target_languages IS NOT NULL
     AND array_length(e.target_languages, 1) > 0
     AND (p_language IS NULL OR NOT (p_language = ANY (e.target_languages))) THEN
    RETURN false;
  END IF;

  IF e.target_roles IS NOT NULL AND array_length(e.target_roles, 1) > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id AND ur.role = ANY (e.target_roles)
    ) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- Replace permissive read policy with a targeted-aware one. Admins keep full read.
DROP POLICY IF EXISTS "Anyone can view active events" ON public.events_announcements;
DROP POLICY IF EXISTS "Users can view visible events" ON public.events_announcements;

CREATE POLICY "Users can view visible events"
ON public.events_announcements
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.event_is_visible(id, auth.uid())
);

-- ============================================================
-- Admin RPCs: users list + role management + metrics
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_users(
  _limit int DEFAULT 50,
  _offset int DEFAULT 0,
  _search text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  country text,
  language text,
  created_at timestamptz,
  roles text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    u.email::text,
    p.full_name,
    p.country,
    p.language,
    p.created_at,
    COALESCE(ARRAY(
      SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.user_id
    ), ARRAY[]::text[])
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE _search IS NULL
     OR p.full_name ILIKE '%' || _search || '%'
     OR u.email ILIKE '%' || _search || '%'
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT _limit OFFSET _offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_role(
  _target_user uuid,
  _role app_role,
  _grant boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE admin_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Prevent removing the last admin
    IF _role = 'admin'::app_role THEN
      SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin'::app_role;
      IF admin_count <= 1 THEN
        RAISE EXCEPTION 'cannot remove the last admin';
      END IF;
    END IF;
    DELETE FROM public.user_roles WHERE user_id = _target_user AND role = _role;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_metrics()
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
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'new_users_7d', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= now() - interval '7 days'),
    'new_users_30d', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= now() - interval '30 days'),
    'reports', (SELECT COUNT(*) FROM public.ai_reports),
    'ideas', (SELECT COUNT(*) FROM public.business_ideas),
    'active_events', (SELECT COUNT(*) FROM public.events_announcements WHERE is_active = true),
    'by_country', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('country', country, 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (
        SELECT COALESCE(country, 'Unknown') AS country, COUNT(*) AS c
        FROM public.profiles GROUP BY 1
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.event_is_visible(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(int, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_metrics() TO authenticated;