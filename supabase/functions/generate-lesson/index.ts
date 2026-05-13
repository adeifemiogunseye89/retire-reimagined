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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const subject = String(body.subject ?? "").slice(0, 120);
    const topic = String(body.topic ?? "").slice(0, 240);
    const gradeLevel = String(body.gradeLevel ?? "").slice(0, 60);
    const duration = Math.min(Math.max(parseInt(body.duration ?? "30", 10) || 30, 10), 120);
    const videoUrl = String(body.videoUrl ?? "").slice(0, 500) || null;

    if (!subject || !topic) {
      return new Response(
        JSON.stringify({ error: "Subject and topic are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = `You are a Nigerian curriculum expert (WAEC/NECO/JAMB) building structured recorded lessons. Produce engaging, age-appropriate lesson content with clear learning objectives, well-organized sections, and a short comprehension quiz.`;

    const userPrompt = `Build a recorded lesson plan:
- Subject: ${subject}
- Topic: ${topic}
- Grade level: ${gradeLevel || "Not specified"}
- Target duration: ${duration} minutes

Return: a catchy title, a 2-3 sentence summary, 4-6 lesson sections (each with a heading and 2-4 paragraph body covering key concepts, examples, and Nigerian context where helpful), and a 5-question quiz with 4 multiple-choice options each plus correct answer index (0-based) and brief explanation.`;

    const aiResponse = await fetch(
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
                name: "build_lesson",
                description: "Return a structured recorded lesson with sections and quiz.",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    summary: { type: "string" },
                    sections: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          heading: { type: "string" },
                          body: { type: "string" },
                        },
                        required: ["heading", "body"],
                        additionalProperties: false,
                      },
                    },
                    quiz: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          question: { type: "string" },
                          options: { type: "array", items: { type: "string" } },
                          correct_index: { type: "integer" },
                          explanation: { type: "string" },
                        },
                        required: ["question", "options", "correct_index", "explanation"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["title", "summary", "sections", "quiz"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "build_lesson" } },
        }),
      },
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResponse.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call returned by AI");
    const parsed = JSON.parse(toolCall.function.arguments);

    const { data: saved, error: saveError } = await supabase
      .from("lessons")
      .insert({
        user_id: user.id,
        title: parsed.title,
        subject,
        topic,
        grade_level: gradeLevel || null,
        duration_minutes: duration,
        summary: parsed.summary ?? null,
        sections: parsed.sections ?? [],
        quiz: parsed.quiz ?? [],
        video_url: videoUrl,
        status: "published",
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error", saveError);
      throw saveError;
    }

    return new Response(JSON.stringify({ lesson: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lesson error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
