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

    const prompt = `You are an expert retirement planning advisor for Nigerian public servants. 
Analyze this person's profile and generate a comprehensive retirement readiness report.

Profile:
- Name: ${profileData.fullName}
- Age: ${profileData.age}
- Years in service: ${profileData.yearsInService}
- Grade level: ${profileData.gradeLevel}
- Sector: ${profileData.sector}
- Current monthly salary: ₦${profileData.currentSalary}
- Expected monthly pension: ₦${profileData.pensionProjection}
- Skills: ${profileData.skills}
- Business interests: ${profileData.businessInterests}

Generate a JSON response with EXACTLY this structure (no markdown, just valid JSON):
{
  "readinessScore": <number 1-100>,
  "pensionGap": <number: monthly salary minus pension>,
  "inflationNote": "<one sentence about inflation impact on their pension>",
  "topIdeas": [
    {
      "title": "<specific business idea tailored to their skills and sector>",
      "description": "<2-3 sentence explanation of the idea and how to start>",
      "projectedIncome": <estimated monthly income in Naira>
    },
    {
      "title": "...",
      "description": "...",
      "projectedIncome": ...
    },
    {
      "title": "...",
      "description": "...",
      "projectedIncome": ...
    }
  ],
  "nextSteps": [
    "<actionable step 1>",
    "<actionable step 2>",
    "<actionable step 3>",
    "<actionable step 4>"
  ]
}`;

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a retirement planning AI. Always respond with valid JSON only, no markdown formatting." },
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

    // Save report to database
    const { error: insertError } = await supabase.from("ai_reports").insert({
      user_id: user.id,
      readiness_score: report.readinessScore,
      pension_gap: report.pensionGap,
      top_business_ideas: report.topIdeas,
      report_json: report,
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
