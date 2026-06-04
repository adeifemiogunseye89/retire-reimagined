import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const fmtMoney = (n: number | null | undefined, currency = "USD", locale = "en-US") => {
  if (n === null || n === undefined || isNaN(Number(n))) return "Unknown";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(n));
  } catch {
    return `${currency} ${Number(n).toLocaleString()}`;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    // Prefer publishable key (works with new ES256 JWTs), fall back to anon key
    const SUPABASE_KEY =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Extract user from JWT directly to avoid library verification issues
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData?.user) {
      console.error("Auth failed:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized", detail: authError?.message }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const { messages } = await req.json();

    // Fetch rich personalized context
    const [profileRes, reportRes, metricsRes, savingsRes, ideasRes, logsRes] = await Promise.all([
      supabaseClient.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabaseClient.from("ai_reports").select("*").eq("user_id", user.id).order("generated_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseClient.from("user_metrics").select("*").eq("user_id", user.id).maybeSingle(),
      supabaseClient.from("savings_plans").select("*").eq("user_id", user.id).maybeSingle(),
      supabaseClient.from("business_ideas").select("idea_title, description, projected_monthly_income, status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
      supabaseClient.from("metric_logs").select("metric_type, value, note, logged_at").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(20),
    ]);

    const profile = profileRes.data as any;
    const report = reportRes.data as any;
    const metrics = metricsRes.data as any;
    const savings = savingsRes.data as any;
    const ideas = (ideasRes.data || []) as any[];
    const logs = (logsRes.data || []) as any[];

    const currency = profile?.currency || "USD";
    const locale = profile?.language || "en-US";
    const country = profile?.country || "Unknown";
    const fmt = (n: number | null | undefined) => fmtMoney(n, currency, locale);

    const ideasList = ideas.length
      ? ideas.map((i, idx) => `  ${idx + 1}. ${i.idea_title} — projected ${fmt(i.projected_monthly_income)}/mo (${i.status})`).join("\n")
      : "  (none saved yet)";

    // Summarize recent activity from metric_logs
    const LABEL: Record<string, string> = {
      side_income: "Side income",
      business_launched: "Business launched",
      students_enrolled: "Students enrolled",
      anxiety_checkin: "Anxiety check-in",
    };
    const fmtDate = (d: string) => {
      try { return new Date(d).toLocaleDateString(locale, { month: "short", day: "numeric" }); } catch { return d; }
    };
    const recentLogs = logs.slice(0, 10).map((l) => {
      const v = l.metric_type === "side_income" ? fmt(Number(l.value)) : `${Number(l.value)}${l.metric_type === "anxiety_checkin" ? "/100" : ""}`;
      return `  • ${fmtDate(l.logged_at)} — ${LABEL[l.metric_type] || l.metric_type}: ${v}${l.note ? ` (“${String(l.note).slice(0, 80)}”)` : ""}`;
    }).join("\n") || "  (no recent entries — encourage the user to start logging)";

    // 7-day rollups for momentum signals
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const last7 = logs.filter((l) => new Date(l.logged_at).getTime() >= since);
    const income7 = last7.filter((l) => l.metric_type === "side_income").reduce((s, l) => s + Number(l.value), 0);
    const launches7 = last7.filter((l) => l.metric_type === "business_launched").reduce((s, l) => s + Number(l.value), 0);
    const students7 = last7.filter((l) => l.metric_type === "students_enrolled").reduce((s, l) => s + Number(l.value), 0);
    const anx7 = last7.filter((l) => l.metric_type === "anxiety_checkin");
    const anx7Avg = anx7.length ? Math.round(anx7.reduce((s, l) => s + Number(l.value), 0) / anx7.length) : null;
    const lastEntry = logs[0] ? `${fmtDate(logs[0].logged_at)} (${LABEL[logs[0].metric_type] || logs[0].metric_type})` : "never";

    // Map BCP-47 / ISO-639 to a human language name for the prompt.
    const LANG_NAMES: Record<string, string> = {
      en: "English", fr: "French", de: "German", es: "Spanish", pt: "Portuguese",
      sw: "Swahili", ha: "Hausa", yo: "Yoruba", ig: "Igbo", zu: "Zulu", af: "Afrikaans",
      ar: "Arabic", he: "Hebrew",
    };
    const langBase = String(locale).toLowerCase().split("-")[0];
    const languageName = LANG_NAMES[langBase] || "English";

    const systemPrompt = `You are Reignite AI Coach — a warm, knowledgeable retirement & career-transition assistant for a global audience. ALWAYS respond in ${languageName} (locale ${locale}); translate any quoted figures or section labels into ${languageName}. Speak in a friendly, encouraging, plain-language tone. Always reference money in the user's local currency (${currency}, ${country}, locale ${locale}). Never use ₦/Naira unless their currency is NGN.

USER PROFILE
- Name: ${profile?.full_name || "User"}
- Age: ${profile?.age ?? "Unknown"}
- Country/Region: ${country}${profile?.region ? `, ${profile.region}` : ""}
- Currency / Language: ${currency} / ${locale}
- Sector: ${profile?.sector || "Unknown"} (${profile?.grade_level || "—"}, ${profile?.years_in_service ?? "?"} yrs)
- Current Salary: ${fmt(profile?.current_salary)}
- Projected Pension: ${fmt(profile?.pension_projection)}/month
- Monthly Expenses: ${fmt(profile?.monthly_expenses)}
- Dependents: ${profile?.dependents ?? "Unknown"}
- Skills: ${Array.isArray(profile?.skills) ? profile.skills.join(", ") : "Not specified"}
- Business Interests: ${Array.isArray(profile?.business_interests) ? profile.business_interests.join(", ") : "Not specified"}

RETIREMENT REPORT
- Readiness Score: ${report?.readiness_score ?? "Not generated"}/100
- Pension Gap: ${fmt(report?.pension_gap)}/month
- Inflation note: ${report?.report_json?.inflationNote || "—"}

SAVINGS PLAN
- Monthly savings target: ${fmt(savings?.monthly_savings_target)}
- Emergency fund goal: ${fmt(savings?.emergency_fund_goal)}
- Current savings: ${fmt(savings?.current_savings)}
- Horizon: ${savings?.years_horizon ?? "?"} years
- Inflation rate used: ${savings?.last_inflation_rate ?? "?"}%

CURRENT METRICS
- Side Income: ${fmt(metrics?.side_income)}/month
- Businesses Launched: ${metrics?.businesses_launched ?? 0}
- Wellness Score: ${metrics?.anxiety_score ?? 50}/100

SAVED BUSINESS IDEAS
${ideasList}

LAST 7 DAYS (from metric_logs)
- Side income logged: ${fmt(income7)}
- New launches: ${launches7}
- New students: ${students7}
- Wellness check-ins: ${anx7.length}${anx7Avg !== null ? ` (avg anxiety ${anx7Avg}/100)` : ""}
- Last entry: ${lastEntry}

RECENT ACTIVITY (most recent first)
${recentLogs}

GUIDELINES
- Give specific, actionable advice grounded in the data above. Always reference the user's RECENT ACTIVITY when giving daily motivation or next-step recommendations — call out streaks, gaps (e.g. "you haven't logged income in 5 days"), wellness trends, and momentum.
- If recent activity is empty, encourage the user to open the Metrics tab and log their first entry.
- Reference the user's country's retirement/pension context when relevant (e.g. PenCom in NG, 401(k)/IRA in US, ISA/SIPP in UK, RRSP/TFSA in CA, Riester/Rürup in DE, PER in FR, NSSF in KE, SSNIT in GH).
- Help them close the pension gap via side businesses, upskilling, or expense optimization.
- Be concise (2–3 short paragraphs). Use the user's currency for every number. Light emojis ok 🌟`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
