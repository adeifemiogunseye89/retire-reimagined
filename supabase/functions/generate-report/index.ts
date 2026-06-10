import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("Missing auth token");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { profileData } = await req.json();
    if (!profileData) throw new Error("Missing profileData");

    const country = profileData.country || "Nigeria";
    const currency = profileData.currency || "NGN";
    const inflation = profileData.inflation ?? 10;

    const prompt = `You are an expert global retirement and career-transition advisor.
Analyze this person's profile and generate a comprehensive readiness report tailored to ${country}.

Profile:
- Name: ${profileData.fullName}
- Country: ${country} (currency: ${currency}, indicative annual inflation: ${inflation}%)
- Region: ${profileData.region || "—"}
- Age: ${profileData.age}
- Years in service: ${profileData.yearsInService}
- Job level: ${profileData.gradeLevel}
- Profession / sector: ${profileData.sector}
- Current monthly income: ${currency} ${profileData.currentSalary}
- Expected monthly pension: ${currency} ${profileData.pensionProjection}
- Monthly expenses: ${currency} ${profileData.monthlyExpenses || "n/a"}
- Dependents: ${profileData.dependents || 0}
- Skills: ${profileData.skills}
- Reinvention interests: ${profileData.businessInterests}

Use the local pension system, cost of living, and labor market of ${country} when reasoning.
All monetary values in your response must be in ${currency} (numbers only, no symbols).

Generate a JSON response with EXACTLY this structure (no markdown, just valid JSON):
{
  "readinessScore": <number 1-100>,
  "pensionGap": <number: monthly income minus pension, in ${currency}>,
  "inflationNote": "<one sentence about how ${inflation}% inflation impacts purchasing power in ${country}>",
  "topIdeas": [
    { "title": "<region-relevant business/income idea matched to skills>", "description": "<2-3 sentence explanation>", "projectedIncome": <monthly ${currency}> },
    { "title": "...", "description": "...", "projectedIncome": ... },
    { "title": "...", "description": "...", "projectedIncome": ... }
  ],
  "nextSteps": [
    "<actionable step 1>",
    "<actionable step 2>",
    "<actionable step 3>",
    "<actionable step 4>"
  ]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a globally-aware retirement and career-transition AI advisor. Always respond with valid JSON only, no markdown formatting." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    let reportContent = aiData.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    reportContent = reportContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let report;
    try {
      report = JSON.parse(reportContent);
    } catch {
      console.error("Failed to parse AI response:", reportContent);
      throw new Error("AI returned invalid JSON");
    }

    // Pull the profile's current score_inputs_hash so the report references
    // the exact input snapshot (kept in sync by a DB trigger on profiles).
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("score_inputs_hash")
      .eq("user_id", user.id)
      .maybeSingle();
    const inputs_hash = (profileRow as any)?.score_inputs_hash ?? null;

    const { error: insertError } = await supabase.from("ai_reports").insert({
      user_id: user.id,
      readiness_score: report.readinessScore,
      pension_gap: report.pensionGap,
      top_business_ideas: report.topIdeas,
      report_json: report,
      inputs_hash,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
    }



    // Save business ideas
    for (const idea of report.topIdeas) {
      await supabase.from("business_ideas").insert({
        user_id: user.id,
        idea_title: idea.title,
        description: idea.description,
        projected_monthly_income: idea.projectedIncome,
      });
    }

    // Initialize user metrics
    await supabase.from("user_metrics").upsert({
      user_id: user.id,
      side_income: 0,
      businesses_launched: 0,
      students_enrolled: 0,
      anxiety_score: 50,
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
