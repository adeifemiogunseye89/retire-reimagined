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

/** Hard UTC-calendar caps, enforced by the backend-only quota RPC. */
export const AI_USAGE_LIMITS = {
  "ai-coach": { daily: 100, monthly: 2000 },
  "generate-report": { daily: 10, monthly: 60 },
  "parse-pension-document": { daily: 10, monthly: 50 },
  "budget-analysis": { daily: 30, monthly: 300 },
  "inflation-analysis": { daily: 30, monthly: 300 },
  "idea-viability": { daily: 40, monthly: 300 },
} as const;

export type QuotaFunction = keyof typeof AI_USAGE_LIMITS;
export type AiQuotaResult = {
  allowed: boolean;
  daily_used: number;
  daily_limit: number;
  monthly_used: number;
  monthly_limit: number;
};

/**
 * Consumes one hard daily/monthly allowance. Unlike burst throttles, an
 * unavailable quota store fails closed: external AI costs must not be uncapped.
 */
export async function consumeAiUsageQuota(
  fn: QuotaFunction,
  userId: string,
): Promise<AiQuotaResult | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;

  try {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await admin.rpc("consume_ai_usage_quota", {
      _user_id: userId,
      _fn: fn,
    });
    if (error) {
      console.error("consume_ai_usage_quota error", error.message);
      return null;
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result || typeof result.allowed !== "boolean") return null;
    return result as AiQuotaResult;
  } catch (e) {
    console.error("AI usage quota check failed", e);
    return null;
  }
}

/** Clear 429 at a hard cap; 503 if the cap cannot be checked safely. */
export function aiUsageQuotaResponse(
  fn: QuotaFunction,
  result: AiQuotaResult | null,
  corsHeaders: Record<string, string>,
): Response | null {
  if (!result) {
    return new Response(
      JSON.stringify({ error: "AI usage limits are temporarily unavailable. Please try again shortly." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (result.allowed) return null;

  const dailyReset = new Date();
  dailyReset.setUTCHours(24, 0, 0, 0);
  const monthlyReset = new Date(Date.UTC(dailyReset.getUTCFullYear(), dailyReset.getUTCMonth() + 1, 1));
  const resetAt = result.daily_used >= result.daily_limit ? dailyReset : monthlyReset;
  const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
  const limits = AI_USAGE_LIMITS[fn];

  return new Response(JSON.stringify({
    error: "You've reached this feature's usage limit. Please try again after the limit resets.",
    code: "AI_USAGE_LIMIT_REACHED",
    function: fn,
    daily: { used: result.daily_used, limit: result.daily_limit },
    monthly: { used: result.monthly_used, limit: result.monthly_limit },
    configuredLimits: limits,
  }), {
    status: 429,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Retry-After": String(retryAfter),
    },
  });
}

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
