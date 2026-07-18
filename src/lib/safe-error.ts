/**
 * Convert any thrown value into a user-safe message.
 *
 * Rationale: raw error messages from Supabase / PostgREST / edge functions can
 * leak SQL fragments, table names, JWT details, or stack traces. Anything shown
 * to end users must go through this helper. The original error should still be
 * captured via telemetry (logError) for debugging.
 */

const SAFE_PATTERNS: Array<{ test: RegExp; message: string }> = [
  { test: /rate.?limit|429|too many/i, message: "You're doing that too fast. Please wait a moment and try again." },
  { test: /credits?.?exhaust|402|payment required/i, message: "AI credits are exhausted. Please try again later." },
  { test: /unauth|401|invalid.?token|jwt/i, message: "Your session expired. Please sign in again." },
  { test: /forbidden|403|permission/i, message: "You don't have permission to do that." },
  { test: /not.?found|404/i, message: "We couldn't find that." },
  { test: /network|failed to fetch|timeout|abort/i, message: "Network issue — check your connection and try again." },
  { test: /confirm|verif/i, message: "Please confirm your email before continuing." },
];

export function safeErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!raw) return fallback;
  for (const { test, message } of SAFE_PATTERNS) if (test.test(raw)) return message;
  // If nothing matched, return the fallback rather than the raw string —
  // never expose internals just because they happen to be human-readable.
  return fallback;
}
