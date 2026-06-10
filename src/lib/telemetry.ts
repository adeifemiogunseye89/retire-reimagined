/**
 * Lightweight self-hosted telemetry (errors + page/tab views).
 * Best-effort: never throws, never blocks UI.
 */
import { supabase } from "@/integrations/supabase/client";

const APP_VERSION = "0.1.0";
const SESSION_ID =
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

let lastView: { key: string; at: number } | null = null;
const DEDUP_MS = 30_000;

function truncate(s: string | undefined, n: number) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n) : s;
}

async function getUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function logError(err: unknown, ctx?: { route?: string }) {
  try {
    const e = err instanceof Error ? err : new Error(String(err));
    const user_id = await getUserId();
    await supabase.from("client_errors").insert({
      user_id,
      route: ctx?.route ?? (typeof location !== "undefined" ? location.pathname : null),
      message: truncate(e.message || "Unknown error", 1024)!,
      stack: truncate(e.stack, 4096) ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      app_version: APP_VERSION,
    });
  } catch {
    /* swallow */
  }
}

export async function logPageView(route: string, tab?: string) {
  const key = `${route}|${tab || ""}`;
  const now = Date.now();
  if (lastView && lastView.key === key && now - lastView.at < DEDUP_MS) return;
  lastView = { key, at: now };
  try {
    const user_id = await getUserId();
    await supabase.from("page_events").insert({
      user_id,
      route,
      tab: tab ?? null,
      session_id: SESSION_ID,
    });
  } catch {
    /* swallow */
  }
}

let installed = false;
export function installGlobalErrorHandlers() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (ev) => {
    logError(ev.error || ev.message, { route: location.pathname });
  });
  window.addEventListener("unhandledrejection", (ev) => {
    logError(ev.reason, { route: location.pathname });
  });
}
