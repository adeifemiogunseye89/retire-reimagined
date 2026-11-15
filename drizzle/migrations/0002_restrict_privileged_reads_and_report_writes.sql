-- Tighten direct execution of security-definer readers and make report writes server-owned.
REVOKE ALL ON FUNCTION public.admin_activity_log(integer, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_activity_log(integer, text, integer, integer) TO service_role;
REVOKE ALL ON FUNCTION public.event_is_visible(uuid, uuid) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users can insert own reports" ON public.ai_reports;
REVOKE INSERT, UPDATE, DELETE ON public.ai_reports FROM anon, authenticated;
GRANT SELECT ON public.ai_reports TO authenticated;
GRANT ALL ON public.ai_reports TO service_role;

-- Use a narrowly scoped privileged RPC to log administrator provisioning actions from the already admin-verified Edge Function.
CREATE OR REPLACE FUNCTION public.admin_record_account_action(
  _actor_user_id uuid,
  _target_user_id uuid,
  _action text,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _actor_user_id IS NULL OR _target_user_id IS NULL OR _action NOT IN ('account_created', 'account_invited') THEN
    RAISE EXCEPTION 'invalid audit event';
  END IF;
  INSERT INTO public.admin_audit_log (actor_user_id, target_user_id, action, target_resource, details)
  VALUES (_actor_user_id, _target_user_id, _action, 'auth_user', COALESCE(_details, '{}'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_record_account_action(uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_account_action(uuid, uuid, text, jsonb) TO service_role;
