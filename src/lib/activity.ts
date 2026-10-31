/**
 * Event-level user activity logging for the admin Activity Log page (/admin/activity).
 * Best-effort by design: never throws, never blocks UI — same discipline as telemetry.ts.
 * Every event carries the signed-in user's id; RLS rejects anything else.
 */
import { supabase } from "@/integrations/supabase/client";

const DETAIL_MAX = 200;
const ACTION_MAX = 60;
const ENTITY_MAX = 100;

async function getUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Record one user action (e.g. "plan_save", "sign_in", "goal_create").
 * `detail` is a short human-readable summary shown on the admin activity page;
 * `entity` names the affected thing (idea title, goal title, document name).
 * Identical calls are deduped for 10s so rapid UI loops cannot flood the table.
 */
let lastActivity: { key: string; at: number } | null = null;
const DEDUP_MS = 10_000;

export async function logActivity(
  action: string,
  detail?: string,
  entity?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    const key = `${action}|${detail ?? ""}|${entity ?? ""}`;
    const now = Date.now();
    if (lastActivity && lastActivity.key === key && now - lastActivity.at < DEDUP_MS) return;
    lastActivity = { key, at: now };

    const user_id = await getUserId();
    if (!user_id) return;

    await (supabase as any).from("activity_log").insert({
      user_id,
      action: action.slice(0, ACTION_MAX),
      entity: entity ? entity.slice(0, ENTITY_MAX) : null,
      detail: detail ? detail.slice(0, DETAIL_MAX) : null,
      metadata: metadata ?? null,
    });
  } catch {
    /* swallow — activity logging must never break the app */
  }
}

/**
 * Auth-state tracking: records one sign_in event per genuine (re)sign-in in this
 * browser tab — page refreshes with a persisted session do NOT create events.
 * State lives in sessionStorage so a refresh restores the "already signed in" mark.
 */
const AUTH_KEY = "reignite:activity-auth";

function readAuthMark(): { userId: string | null } {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { userId: null };
}

function writeAuthMark(mark: { userId: string | null }) {
  try {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(mark));
  } catch {
    /* ignore */
  }
}

export function trackAuthEvent(event: string, userId: string | null) {
  if (event === "SIGNED_OUT") {
    // Clear the mark so the next genuine sign-in in this tab is logged again.
    writeAuthMark({ userId: null });
    return;
  }
  if (event !== "SIGNED_IN" || !userId) return;
  const mark = readAuthMark();
  if (mark.userId === userId) return; // session restore / refresh — not a new login
  writeAuthMark({ userId });
  void logActivity("sign_in");
}
