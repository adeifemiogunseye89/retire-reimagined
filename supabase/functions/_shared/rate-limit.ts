// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/**
 * Ad-hoc per-user rate limiting for expensive edge functions.
 *
 * Counters live in `public.rate_limits` and are incremented atomically by the
 * backend-only `rate_limit_hit()` database function. The table and the function
 * are reachable ONLY with the service_role key, so a client can neither read
 * nor forge its own quota.
 *
 * Fail-open by design: if the counter store is unreachable we let the request
 * through rather than breaking a paying user's dashboard.
 */

/** Sensible per-user allowances. Generous for humans, hostile to abuse loops. */
export const LIMITS = {
  // Chat is interactive, so it needs the most headroom.
  "ai-coach": { limit: 30, windowSeconds: 60 },
  // Heavy, multi-step AI generations.
  "generate-report": { limit: 5, windowSeconds: 300 },
  "parse-pension-document": { limit: 10, windowSeconds: 3600 },
  "budget-analysis": { limit: 15, windowSeconds: 300 },
  "inflation-analysis": { limit: 15, windowSeconds: 300 },
  "idea-viability": { limit: 20, windowSeconds: 300 },
  "seed-habits": { limit: 5, windowSeconds: 3600 },
} as const;

export type RateLimitedFn = keyof typeof LIMITS;

/**
 * Records one call for `userId` against `fn`.
 * @returns `true` when the caller is still inside their allowance.
 */
export async function checkRateLimit(
  fn: RateLimitedFn,
  userId: string,
): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return true; // fail open

  const { limit, windowSeconds } = LIMITS[fn];

  try {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await admin.rpc("rate_limit_hit", {
      _user_id: userId,
      _fn: fn,
      _limit: limit,
      _window_seconds: windowSeconds,
    });
    if (error) {
      console.error("rate_limit_hit error", error.message);
      return true; // fail open
    }
    return data !== false;
  } catch (e) {
    console.error("rate limit check failed", e);
    return true; // fail open
  }
}

/** Standard 429 response for a throttled caller. */
export function rateLimitResponse(
  fn: RateLimitedFn,
  corsHeaders: Record<string, string>,
): Response {
  const { windowSeconds } = LIMITS[fn];
  return new Response(
    JSON.stringify({
      error: "You're doing that a bit too fast. Please wait a moment and try again.",
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(windowSeconds),
      },
    },
  );
}
