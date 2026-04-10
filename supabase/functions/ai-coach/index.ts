import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    // Get user profile for context
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();

    // Fetch profile and report for personalized context
    const [profileRes, reportRes, metricsRes] = await Promise.all([
      supabaseClient.from("profiles").select("*").eq("user_id", user.id).single(),
      supabaseClient.from("ai_reports").select("*").eq("user_id", user.id).order("generated_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseClient.from("user_metrics").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    const profile = profileRes.data;
    const report = reportRes.data;
    const metrics = metricsRes.data;

    const systemPrompt = `You are Reignite AI Coach — a warm, knowledgeable retirement planning assistant for Nigerian public servants. You speak in a friendly, encouraging tone. Use naira (₹) for currency.

USER PROFILE:
- Name: ${profile?.full_name || "User"}
- Age: ${profile?.age || "Unknown"}
- Years in Service: ${profile?.years_in_service || "Unknown"}
- Grade Level: ${profile?.grade_level || "Unknown"}
- Sector: ${profile?.sector || "Unknown"}
- Current Salary: ₦${profile?.current_salary?.toLocaleString() || "Unknown"}
- Pension Projection: ₦${profile?.pension_projection?.toLocaleString() || "Unknown"}/month
- Skills: ${Array.isArray(profile?.skills) ? (profile.skills as string[]).join(", ") : "Not specified"}
- Business Interests: ${Array.isArray(profile?.business_interests) ? (profile.business_interests as string[]).join(", ") : "Not specified"}

RETIREMENT REPORT:
- Readiness Score: ${report?.readiness_score || "Not generated"}/100
- Pension Gap: ₦${report?.pension_gap?.toLocaleString() || "Unknown"}/month
- Top Business Ideas: ${report?.top_business_ideas ? JSON.stringify(report.top_business_ideas) : "None yet"}

CURRENT METRICS:
- Side Income: ₦${metrics?.side_income?.toLocaleString() || "0"}/month
- Businesses Launched: ${metrics?.businesses_launched || 0}
- Wellness Score: ${metrics?.anxiety_score || 50}/100

Guidelines:
- Give specific, actionable advice based on the user's data above
- Focus on bridging the pension gap through side businesses and income
- Reference Nigerian pension regulations (PenCom) when relevant
- Be encouraging about post-retirement opportunities
- Keep responses concise (2-3 paragraphs max)
- Use emojis sparingly for warmth 🌟`;

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
