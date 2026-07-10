// Retention email dispatcher — triggered daily by pg_cron.
// Sends day-7 re-engagement, monthly savings nudge, and stale-report reminders.
// Enforces a 7-day quiet window per user via public.email_log.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://reignite.app";
const FROM_EMAIL = Deno.env.get("RETENTION_FROM_EMAIL") || "Reignite <noreply@reignite.app>";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

type EmailType = "day7_reengagement" | "monthly_savings_nudge" | "report_stale";

interface Payload {
  to: string;
  subject: string;
  html: string;
  user_id: string;
  email_type: EmailType;
}

const footer = (userId: string) => `
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
  <p style="font-size:12px;color:#6b7280;line-height:1.6">
    You're receiving this from <strong>Reignite</strong> — your retirement readiness coach.<br/>
    <a href="${APP_URL}/unsubscribe?u=${encodeURIComponent(userId)}" style="color:#6b7280">Unsubscribe with one click</a>.
  </p>
`;

const wrap = (bodyHtml: string, userId: string) => `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;line-height:1.6">
    ${bodyHtml}
    ${footer(userId)}
  </div>
`;

async function sendEmail(p: Payload): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing — skipping send", p.email_type, p.to);
    return false;
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [p.to],
        subject: p.subject,
        html: p.html,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("resend failed", r.status, t);
      return false;
    }
    await admin.from("email_log").insert({
      user_id: p.user_id,
      email_type: p.email_type,
      subject: p.subject,
    });
    return true;
  } catch (e) {
    console.error("sendEmail error", e);
    return false;
  }
}

// True if this user has received ANY retention email in the last 7 days.
async function withinQuietWindow(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("email_log")
    .select("id")
    .eq("user_id", userId)
    .gte("sent_at", since)
    .limit(1);
  if (error) {
    console.error("email_log check failed", error);
    return true; // fail-safe: don't spam
  }
  return (data?.length || 0) > 0;
}

function firstName(fullName: string | null): string {
  if (!fullName) return "there";
  return fullName.split(/\s+/)[0] || "there";
}

// ---------- Day 7 re-engagement ----------
async function processDay7(): Promise<number> {
  // Users whose auth account is > 7d old and last_sign_in_at < 2d after created_at
  const { data: users, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
  if (error) { console.error(error); return 0; }
  let sent = 0;
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const u of users.users) {
    if (!u.email) continue;
    const created = new Date(u.created_at).getTime();
    if (created > cutoff) continue;
    const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : created;
    const daysAfterCreate = (lastSignIn - created) / (24 * 60 * 60 * 1000);
    if (daysAfterCreate > 2) continue;

    if (await withinQuietWindow(u.id)) continue;

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("user_id", u.id)
      .maybeSingle();
    const { data: report } = await admin
      .from("ai_reports")
      .select("readiness_score, report_json")
      .eq("user_id", u.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const name = firstName(profile?.full_name || null);
    const score = report?.readiness_score ?? null;
    const risks = ((report?.report_json as any)?.riskFlags || (report?.report_json as any)?.risks) as string[] | undefined;
    const topRisk = Array.isArray(risks) && risks.length > 0 ? risks[0] : "an open retirement income gap";

    const subject = `Your retirement gap is still open, ${name}.`;
    const html = wrap(`
      <h2 style="font-size:20px;margin:0 0 12px">Hey ${name} —</h2>
      <p>You started your Reignite plan a week ago and haven't been back.</p>
      ${score !== null ? `<p>Your last readiness score was <strong>${score}/100</strong>.</p>` : ""}
      <p>Biggest flag from your report: <strong>${topRisk}</strong>.</p>
      <p style="margin-top:20px"><a href="${APP_URL}/dashboard" style="background:#1e3a5f;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Log in and run the gap simulator — it takes 2 minutes.</a></p>
    `, u.id);

    if (await sendEmail({ to: u.email, subject, html, user_id: u.id, email_type: "day7_reengagement" })) sent++;
  }
  return sent;
}

// ---------- Monthly savings nudge (3rd of month) ----------
async function processMonthlyNudge(): Promise<number> {
  const now = new Date();
  if (now.getUTCDate() !== 3) return 0;

  const startPrev = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 1).toISOString();
  const endPrev = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1).toISOString();
  const monthName = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
    .toLocaleString("en-US", { month: "long" });

  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
  if (!users) return 0;
  let sent = 0;

  for (const u of users.users) {
    if (!u.email) continue;
    if (await withinQuietWindow(u.id)) continue;

    const { count } = await admin
      .from("metric_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", u.id)
      .eq("metric_type", "savings_contribution")
      .gte("logged_at", startPrev)
      .lt("logged_at", endPrev);
    if ((count || 0) > 0) continue;

    const { data: profile } = await admin.from("profiles").select("full_name").eq("user_id", u.id).maybeSingle();
    const { data: plan } = await admin.from("savings_plans").select("monthly_savings_target").eq("user_id", u.id).maybeSingle();
    const name = firstName(profile?.full_name || null);
    const target = plan?.monthly_savings_target;

    const subject = `Did you save anything in ${monthName}, ${name}?`;
    const html = wrap(`
      <h2 style="font-size:20px;margin:0 0 12px">Hey ${name},</h2>
      <p>We didn't see any savings logged for <strong>${monthName}</strong>.</p>
      ${target ? `<p>Your own monthly target: <strong>${target}</strong>.</p>` : ""}
      <p>The gap closure chart only moves when you log contributions. If you did save, log it in 30 seconds so your progress reflects reality.</p>
      <p style="margin-top:20px"><a href="${APP_URL}/dashboard?tab=metrics" style="background:#1e3a5f;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Log ${monthName}'s savings →</a></p>
    `, u.id);

    if (await sendEmail({ to: u.email, subject, html, user_id: u.id, email_type: "monthly_savings_nudge" })) sent++;
  }
  return sent;
}

// ---------- Report staleness (>45d) ----------
async function processStaleReport(): Promise<number> {
  const cutoff = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
  const { data: reports } = await admin
    .from("ai_reports")
    .select("user_id, generated_at")
    .lt("generated_at", cutoff);
  if (!reports) return 0;

  let sent = 0;
  const seen = new Set<string>();
  for (const r of reports) {
    if (seen.has(r.user_id)) continue;
    seen.add(r.user_id);
    if (await withinQuietWindow(r.user_id)) continue;

    const { data: u } = await admin.auth.admin.getUserById(r.user_id);
    if (!u?.user?.email) continue;
    const { data: profile } = await admin.from("profiles").select("full_name").eq("user_id", r.user_id).maybeSingle();
    const name = firstName(profile?.full_name || null);

    const subject = `Your retirement report is out of date, ${name}.`;
    const html = wrap(`
      <h2 style="font-size:20px;margin:0 0 12px">Hey ${name},</h2>
      <p>Your last readiness report was generated more than 45 days ago.</p>
      <p>Salaries change. Inflation moves. Side income shifts. Your score may no longer reflect where you actually stand today.</p>
      <p style="margin-top:20px"><a href="${APP_URL}/dashboard" style="background:#1e3a5f;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Regenerate your report →</a></p>
    `, r.user_id);

    if (await sendEmail({ to: u.user.email, subject, html, user_id: r.user_id, email_type: "report_stale" })) sent++;
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const [day7, monthly, stale] = await Promise.all([
      processDay7().catch((e) => { console.error("day7", e); return 0; }),
      processMonthlyNudge().catch((e) => { console.error("monthly", e); return 0; }),
      processStaleReport().catch((e) => { console.error("stale", e); return 0; }),
    ]);
    return new Response(JSON.stringify({ ok: true, day7, monthly, stale }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: "dispatch_failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
