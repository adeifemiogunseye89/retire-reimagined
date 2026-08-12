-- =============================================================================
-- Ad-hoc rate limiting support for expensive edge functions.
-- Fixed-window counters keyed by (user_id, fn, window_start).
-- Written to ONLY by edge functions via the service_role; never by clients.
-- =============================================================================

CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  fn text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rate_limits_unique_window UNIQUE (user_id, fn, window_start)
);

CREATE INDEX rate_limits_window_start_idx ON public.rate_limits (window_start);

-- Only backend (service_role) touches this table. No anon/authenticated grants:
-- clients must never read or forge throttle counters.
GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies on purpose: RLS denies every client role by default, while
-- service_role bypasses RLS for the edge-function guard below.

-- =============================================================================
-- rate_limit_hit(): atomically records one call and reports whether the caller
-- is still inside their allowance for the current fixed window.
-- Returns TRUE when the call is allowed, FALSE when the limit is exceeded.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  _user_id uuid,
  _fn text,
  _limit integer,
  _window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w timestamptz;
  c integer;
BEGIN
  -- Bucket "now" into a fixed window (e.g. 60s buckets for a 60s window).
  w := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);

  INSERT INTO public.rate_limits (user_id, fn, window_start, count)
  VALUES (_user_id, _fn, w, 1)
  ON CONFLICT (user_id, fn, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO c;

  -- Opportunistic cleanup of stale buckets (cheap, index-backed).
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';

  RETURN c <= _limit;
END;
$$;

-- Backend-only: never callable from the browser.
REVOKE ALL ON FUNCTION public.rate_limit_hit(uuid, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rate_limit_hit(uuid, text, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.rate_limit_hit(uuid, text, integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(uuid, text, integer, integer) TO service_role;