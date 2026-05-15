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
      project_id = null,
      project_name = "Untitled project",
      description = "",
      timeline_months = 12,
      cost_items = [],
      linked_idea = null,
      savings_plan = null,
      country = "NG",
      country_name = "Nigeria",
      currency = "NGN",
      locale = "en-NG",
      inflation_hint = 28,
    } = body;

    type CostItem = {
      name: string;
      amount: number;
      category: "one_time" | "recurring_monthly" | "recurring_yearly";
    };
    const items: CostItem[] = cost_items;

    const oneTime = items
      .filter((i) => i.category === "one_time")
      .reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const monthly = items
      .filter((i) => i.category === "recurring_monthly")
      .reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const yearly = items
      .filter((i) => i.category === "recurring_yearly")
      .reduce((s, i) => s + (Number(i.amount) || 0), 0);

    const totalNominal =
      oneTime + monthly * timeline_months + yearly * (timeline_months / 12);

    const fmt = (n: number) => {
      try {
        return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n || 0);
      } catch {
        return `${currency} ${Math.round(n || 0).toLocaleString("en-US")}`;
      }
    };

    const systemPrompt = `You are a global budget planner helping professionals in ${country_name} build inflation-proof project budgets. Use recent local central bank / national statistics inflation knowledge. All money is in ${currency}. Be encouraging, specific, practical.`;

    const userPrompt = `Analyze this project budget against ${country_name} inflation:

PROJECT: ${project_name}
Description: ${description}
Timeline: ${timeline_months} months from today
${linked_idea ? `Linked business idea: ${linked_idea.title} (${fmt(linked_idea.projectedIncome || 0)}/mo projected)` : "No linked business idea"}

COST ITEMS (${items.length}, currency: ${currency}):
${items.map((i) => `- ${i.name}: ${fmt(Number(i.amount))} (${i.category})`).join("\n") || "(none yet)"}

Computed nominal total over timeline: ${fmt(totalNominal)}
- One-time: ${fmt(oneTime)}
- Recurring monthly: ${fmt(monthly)} x ${timeline_months}
- Recurring yearly: ${fmt(yearly)} x ${(timeline_months / 12).toFixed(2)}

USER'S SAVINGS PLAN:
${savings_plan ? `- Current savings: ${fmt(savings_plan.currentSavings || 0)}
- Monthly savings target: ${fmt(savings_plan.monthlySavingsTarget || 0)}
- Emergency fund goal: ${fmt(savings_plan.emergencyFundGoal || 0)}
- Business income projection: ${fmt(savings_plan.businessIncomeProjection || 0)}/mo` : "No savings plan set"}

Indicative recent annual inflation for ${country_name}: ~${inflation_hint}% (refine with your latest knowledge), then return strict JSON via the analyze_budget tool. All monetary numeric outputs must be in ${currency}. The yearly_projection should have one entry per year of the timeline (round up months to years, minimum 1 year).`;

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
                name: "analyze_budget",
                description: "Return inflation-adjusted project budget analysis",
                parameters: {
                  type: "object",
                  properties: {
                    inflation_rate: { type: "number", description: "Annual Nigeria inflation rate %" },
                    inflation_source_note: { type: "string" },
                    total_nominal: { type: "number", description: "Total nominal cost over timeline" },
                    total_real: { type: "number", description: "Total inflation-adjusted cost in future naira at end of timeline" },
                    inflation_gap: { type: "number", description: "Extra naira needed due to inflation (total_real - total_nominal)" },
                    funding_from_savings: { type: "number", description: "How much can come from current savings" },
                    funding_from_monthly_target: { type: "number", description: "How much accumulates from monthly savings over timeline" },
                    funding_from_business_income: { type: "number", description: "How much from linked or projected business income over timeline" },
                    funding_shortfall: { type: "number", description: "Remaining shortfall after all funding sources" },
                    headline_message: { type: "string", description: "1-sentence punchy summary" },
                    recommendations: {
                      type: "array",
                      description: "Exactly 4 personalized recommendation strings",
                      items: { type: "string" },
                      minItems: 4,
                      maxItems: 4,
                    },
                    yearly_projection: {
                      type: "array",
                      description: "Year-by-year cumulative cost: nominal vs real",
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
                    "total_nominal",
                    "total_real",
                    "inflation_gap",
                    "funding_from_savings",
                    "funding_from_monthly_target",
                    "funding_from_business_income",
                    "funding_shortfall",
                    "headline_message",
                    "recommendations",
                    "yearly_projection",
                  ],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "analyze_budget" } },
        }),
      }
    );

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please wait a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway returned ${aiResp.status}`);
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");
    const analysis = JSON.parse(toolCall.function.arguments);

    if (project_id) {
      await supabase
        .from("project_budgets")
        .update({
          ai_analysis: analysis,
          last_inflation_rate: analysis.inflation_rate,
          last_analysis_at: new Date().toISOString(),
        })
        .eq("id", project_id)
        .eq("user_id", user.id);
    }

    return new Response(JSON.stringify(analysis), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("budget-analysis error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
