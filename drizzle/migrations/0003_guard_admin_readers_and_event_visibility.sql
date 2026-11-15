-- Require the administrator role inside the SECURITY DEFINER activity reader itself.
CREATE OR REPLACE FUNCTION public.admin_activity_log(
  _days integer DEFAULT 7,
  _search text DEFAULT NULL,
  _limit integer DEFAULT 100,
  _offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  action text,
  entity text,
  detail text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT a.id, a.user_id, au.email::text, p.full_name, a.action, a.entity, a.detail, a.created_at
  FROM public.activity_log a
  LEFT JOIN auth.users au ON au.id = a.user_id
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  WHERE a.created_at >= now() - make_interval(days => greatest(coalesce(_days, 7), 1))
    AND (
      _search IS NULL OR btrim(_search) = '' OR
      coalesce(au.email, '') ILIKE '%' || btrim(_search) || '%' OR
      coalesce(p.full_name, '') ILIKE '%' || btrim(_search) || '%' OR
      a.action ILIKE '%' || btrim(_search) || '%' OR
      coalesce(a.entity, '') ILIKE '%' || btrim(_search) || '%'
    )
  ORDER BY a.created_at DESC
  LIMIT least(greatest(coalesce(_limit, 100), 1), 500)
  OFFSET greatest(coalesce(_offset, 0), 0);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_activity_log(integer, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_activity_log(integer, text, integer, integer) TO authenticated, service_role;

-- The RLS policy calls this helper with auth.uid(); reject arbitrary cross-user checks.
CREATE OR REPLACE FUNCTION public.event_is_visible(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e public.events_announcements%ROWTYPE;
  p_country text;
  p_language text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF _user_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN false;
  END IF;

  SELECT * INTO e FROM public.events_announcements WHERE id = _event_id;
  IF NOT FOUND OR e.is_active IS DISTINCT FROM true THEN RETURN false; END IF;
  IF e.publish_at IS NOT NULL AND e.publish_at > now() THEN RETURN false; END IF;

  SELECT country, language INTO p_country, p_language
  FROM public.profiles WHERE user_id = _user_id;

  IF e.target_countries IS NOT NULL AND array_length(e.target_countries, 1) > 0
     AND (p_country IS NULL OR NOT (p_country = ANY (e.target_countries))) THEN RETURN false; END IF;
  IF e.target_languages IS NOT NULL AND array_length(e.target_languages, 1) > 0
     AND (p_language IS NULL OR NOT (p_language = ANY (e.target_languages))) THEN RETURN false; END IF;

  IF e.target_roles IS NOT NULL AND array_length(e.target_roles, 1) > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id AND ur.role = ANY (e.target_roles)
    ) THEN RETURN false; END IF;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.event_is_visible(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_is_visible(uuid, uuid) TO authenticated, service_role;
