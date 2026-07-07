import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const { data: profile } = await supabase
      .from("profiles")
      .select("country, income_structure, primary_activity, sector, has_pension, retirement_income_target, currency")
      .eq("user_id", user.id)
      .maybeSingle();

    const country = profile?.country || "Nigeria";
    const isInformal = profile?.income_structure === "informal";
    const activity = profile?.primary_activity || profile?.sector || "your work";

    const prompt = `Generate exactly 4 daily/weekly habits to help this person close their retirement income gap.
Context:
- Country: ${country}
- Work: ${isInformal ? `informal / self-employed (${activity})` : `formal employment (${profile?.sector || "—"})`}
- Has pension: ${profile?.has_pension ? "yes" : "no"}
- Currency: ${profile?.currency || "local"}

Rules:
- Each habit must be small, measurable, and doable in under 15 minutes.
- Mix financial discipline (save %, track expenses, contribute to voluntary pension) with income-growth (learn a skill, contact 1 customer, post 1 offer).
- Localise to ${country} — reference realistic vehicles (e.g. Nigeria Micro Pension, Kenya Mbao, US Solo 401(k)) where relevant.
- No generic wellness habits (no "drink water", no "meditate").

Respond with ONLY a valid JSON array, no markdown:
[
  { "title": "...", "description": "why it matters, 1 sentence", "target_per_week": <1-7> },
  ...
]`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a retirement-planning coach. Respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    let content = aiData.choices?.[0]?.message?.content || "[]";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let habits: Array<{ title: string; description: string; target_per_week: number }> = [];
    try { habits = JSON.parse(content); } catch { throw new Error("AI returned invalid JSON"); }
    if (!Array.isArray(habits) || habits.length === 0) throw new Error("No habits generated");

    const rows = habits.slice(0, 6).map((h) => ({
      user_id: user.id,
      title: String(h.title || "").slice(0, 200),
      description: h.description ? String(h.description).slice(0, 500) : null,
      target_per_week: Math.max(1, Math.min(7, Number(h.target_per_week) || 5)),
    })).filter((r) => r.title);

    const { error: insertErr, data: inserted } = await supabase.from("habits").insert(rows).select();
    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ habits: inserted, count: inserted?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seed-habits error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
