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
    const difficulty = ["easy", "medium", "hard"].includes(body.difficulty)
      ? body.difficulty
      : "medium";
    const questionCount = Math.min(
      Math.max(parseInt(body.questionCount ?? "10", 10) || 10, 5),
      20,
    );

    if (!subject || !topic) {
      return new Response(
        JSON.stringify({ error: "Subject and topic are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const systemPrompt = `You are an experienced Nigerian educator creating high-quality worksheets for students. Generate clear, age-appropriate questions that match the Nigerian curriculum (WAEC/NECO/JAMB style where relevant). Use a balanced mix of question types: multiple_choice, short_answer, and fill_blank. Provide an accurate answer key.`;

    const userPrompt = `Create a worksheet with these details:
- Subject: ${subject}
- Topic: ${topic}
- Grade level: ${gradeLevel || "Not specified"}
- Difficulty: ${difficulty}
- Number of questions: ${questionCount}

Return a worksheet title, brief instructions for students, and an array of questions. Each question must include its type, the question text, options (only for multiple_choice), and the correct answer in the answer_key array (matching question order by 1-based number).`;

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
                name: "build_worksheet",
                description: "Return a structured worksheet with questions and answer key.",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    instructions: { type: "string" },
                    questions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          number: { type: "integer" },
                          type: {
                            type: "string",
                            enum: ["multiple_choice", "short_answer", "fill_blank"],
                          },
                          question: { type: "string" },
                          options: {
                            type: "array",
                            items: { type: "string" },
                          },
                        },
                        required: ["number", "type", "question"],
                        additionalProperties: false,
                      },
                    },
                    answer_key: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          number: { type: "integer" },
                          answer: { type: "string" },
                          explanation: { type: "string" },
                        },
                        required: ["number", "answer"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["title", "instructions", "questions", "answer_key"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "build_worksheet" } },
        }),
      },
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again shortly." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "AI credits exhausted. Add funds in Settings → Workspace → Usage.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
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
      .from("worksheets")
      .insert({
        user_id: user.id,
        title: parsed.title,
        subject,
        topic,
        grade_level: gradeLevel || null,
        difficulty,
        question_count: parsed.questions?.length ?? questionCount,
        questions: parsed.questions ?? [],
        answer_key: parsed.answer_key ?? [],
        instructions: parsed.instructions ?? null,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error", saveError);
      throw saveError;
    }

    return new Response(JSON.stringify({ worksheet: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-worksheet error", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
