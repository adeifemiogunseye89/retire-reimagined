-- Belt-and-braces: an inherited blanket grant left `authenticated` with SELECT
-- on the throttle table (RLS already denied every row, since the table has no
-- policies). Revoke it explicitly so quota counters are backend-only.
REVOKE ALL ON public.rate_limits FROM anon;
REVOKE ALL ON public.rate_limits FROM authenticated;
GRANT ALL ON public.rate_limits TO service_role;