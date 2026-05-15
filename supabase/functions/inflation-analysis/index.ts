// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      monthly_savings_target = 0,
      current_savings = 0,
      desired_retirement_income = 0,
      business_income_projection = 0,
      emergency_fund_goal = 0,
      years_horizon = 5,
      pension_projection = 0,
      current_salary = 0,
      business_ideas = [],
      country = "NG",
      country_name = "Nigeria",
      currency = "NGN",
      locale = "en-NG",
      inflation_hint = 28,
    } = body;

    const fmt = (n: number) => {
      try {
        return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n || 0);
      } catch {
        return `${currency} ${Math.round(n || 0).toLocaleString("en-US")}`;
      }
    };

    const systemPrompt = `You are a global financial inflation analyst helping professionals in ${country_name} (${country}) protect their retirement savings. Provide accurate, current estimates of ${country_name}'s annual inflation rate based on recent central bank / national statistics data. All money is in ${currency}. Be encouraging, specific, and practical.`;

    const userPrompt = `Analyze this ${country_name} professional's savings plan against current local inflation:

PROFILE (currency: ${currency}):
- Current salary: ${fmt(current_salary)}/month
- Pension projection: ${fmt(pension_projection)}/month
- Current savings: ${fmt(current_savings)}
- Monthly savings target: ${fmt(monthly_savings_target)}
- Emergency fund goal: ${fmt(emergency_fund_goal)}
- Desired post-retirement income: ${fmt(desired_retirement_income)}/month
- Business income projection: ${fmt(business_income_projection)}/month
- Planning horizon: ${years_horizon} years
- Active business ideas: ${business_ideas.map((i: any) => `${i.title} (${fmt(i.projectedIncome || 0)}/mo)`).join(", ") || "none"}

Indicative recent annual inflation for ${country_name}: ~${inflation_hint}% (you may refine using your latest knowledge of local CPI / central bank data). Then return a strict JSON object via the analyze_inflation tool. All numeric monetary fields must be in ${currency} (not Naira).`;

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "analyze_inflation",
                description: "Return inflation analysis and recommendations",
                parameters: {
                  type: "object",
                  properties: {
                    inflation_rate: {
                      type: "number",
                      description: "Annual Nigeria inflation rate as a percentage (e.g. 28.5)",
                    },
                    inflation_source_note: {
                      type: "string",
                      description: "Short note on the data source (e.g. 'NBS CPI data, est. 2025')",
                    },
                    real_value_today: {
                      type: "number",
                      description: "What the projected nominal savings will be worth in today's purchasing power after years_horizon",
                    },
                    nominal_projected_value: {
                      type: "number",
                      description: "Projected nominal savings (current_savings + monthly_savings_target * 12 * years_horizon)",
                    },
                    inflation_gap_naira: {
                      type: "number",
                      description: "Monthly shortfall in real value vs desired retirement income, in naira",
                    },
                    inflation_gap_percent: {
                      type: "number",
                      description: "Gap as percent of desired retirement income",
                    },
                    headline_message: {
                      type: "string",
                      description: "One-sentence punchy summary of the gap",
                    },
                    smart_recommendation: {
                      type: "string",
                      description: "2-3 sentence personalized recommendation referencing their specific business ideas or savings level",
                    },
                    what_to_prepare_for: {
                      type: "string",
                      description: "1-2 sentences about inflation hedges and what to watch out for",
                    },
                    adjust_your_plan: {
                      type: "string",
                      description: "1-2 sentences with concrete numeric adjustment suggestions",
                    },
                    new_developments_alert: {
                      type: "string",
                      description: "1 sentence on a recent or trending macro/inflation development they should know",
                    },
                    yearly_projection: {
                      type: "array",
                      description: "Year-by-year projection from year 1 to years_horizon",
                      items: {
                        type: "object",
                        properties: {
                          year: { type: "number" },
                          nominal: { type: "number" },
                          real: { type: "number" },
                        },
                        required: ["year", "nominal", "real"],
                      },
                    },
                  },
                  required: [
                    "inflation_rate",
                    "inflation_source_note",
                    "real_value_today",
                    "nominal_projected_value",
                    "inflation_gap_naira",
                    "inflation_gap_percent",
                    "headline_message",
                    "smart_recommendation",
                    "what_to_prepare_for",
                    "adjust_your_plan",
                    "new_developments_alert",
                    "yearly_projection",
                  ],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "analyze_inflation" } },
        }),
      }
    );

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway returned ${aiResp.status}`);
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const analysis = JSON.parse(toolCall.function.arguments);

    // Persist the latest snapshot on the user's plan
    await supabase
      .from("savings_plans")
      .update({
        last_inflation_rate: analysis.inflation_rate,
        last_inflation_check: new Date().toISOString(),
        ai_recommendations: analysis,
      })
      .eq("user_id", user.id);

    return new Response(JSON.stringify(analysis), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("inflation-analysis error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
