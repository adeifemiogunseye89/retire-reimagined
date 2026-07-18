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
    const SUPABASE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const ideaId = String(body?.ideaId || "");
    if (!ideaId) {
      return new Response(JSON.stringify({ error: "ideaId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [ideaRes, profileRes] = await Promise.all([
      supabase.from("business_ideas").select("*").eq("id", ideaId).eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    const idea = ideaRes.data;
    const profile = profileRes.data;
    if (!idea) {
      return new Response(JSON.stringify({ error: "Idea not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const country = profile?.country || "NG";
    const currency = profile?.currency || "USD";
    const incomeStructure = profile?.income_structure || "formal";
    const skills: string[] = Array.isArray(profile?.skills) ? profile.skills : [];
    const targetMonthly = Number(profile?.retirement_income_target || 0);
    const projectedMonthly = Number(idea.projected_monthly_income || 0);

    const systemPrompt = `You are a pragmatic small-business viability coach for someone in ${country} planning income after their formal career.
Score the given idea 0-100 on realistic viability for THIS user (skills=${skills.join(", ") || "unspecified"}, income structure=${incomeStructure}, currency=${currency}).
Return STRICT JSON only, matching this schema:
{
  "score": <0-100 integer>,
  "verdict": "<one line: Strong / Promising / Needs Work / High Risk>",
  "strengths": ["...", "...", "..."],
  "risks": ["...", "...", "..."],
  "next_steps": ["step 1", "step 2", "step 3"],
  "realistic_monthly_income": <integer in ${currency}>
}
Rules: no prose outside JSON, keep bullets under 18 words each, next_steps must be concrete actions doable in 30 days, calibrate realistic_monthly_income against ${country} market rates (not aspirational). If the idea is vague, score lower and say so in verdict.`;

    const userPrompt = `Idea title: ${idea.idea_title}
Description: ${idea.description || "(none)"}
User's projected monthly income: ${projectedMonthly} ${currency}
User's monthly retirement income target: ${targetMonthly} ${currency}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error:", aiRes.status, txt);
      return new Response(JSON.stringify({ error: "AI request failed", detail: txt }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

    const score = Math.max(0, Math.min(100, Number(parsed?.score) || 0));

    await supabase
      .from("business_ideas")
      .update({
        viability_score: score,
        viability_notes: parsed,
        viability_checked_at: new Date().toISOString(),
      })
      .eq("id", ideaId)
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ ok: true, score, viability: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("idea-viability error:", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
