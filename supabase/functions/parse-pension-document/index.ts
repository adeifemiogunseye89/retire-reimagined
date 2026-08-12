import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

/**
 * parse-pension-document
 * Reads an uploaded pension statement (PDF / PNG / JPG) from the private
 * `pension-documents` bucket and asks the AI to extract ONLY three fields.
 * It never writes to the database — the client shows the values to the user
 * for confirmation first (see ProfileEdit.tsx).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  // Storage path inside the pension-documents bucket, e.g. `${user_id}/123-file.pdf`
  file_path: z.string().min(1).max(500),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_KEY =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    // --- Rate limiting (per-user, fail-open). No business logic changed. ---
    if (!(await checkRateLimit("parse-pension-document", user.id))) {
      return rateLimitResponse("parse-pension-document", corsHeaders);
    }


    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return json({ error: "Invalid request payload" }, 400);
    const { file_path } = parsed.data;

    // Only the owner's own folder may be read.
    if (!file_path.startsWith(`${user.id}/`)) return json({ error: "Forbidden" }, 403);

    const { data: blob, error: dlErr } = await supabaseClient.storage
      .from("pension-documents")
      .download(file_path);
    if (dlErr || !blob) return json({ error: "Could not read document" }, 404);

    const bytes = new Uint8Array(await blob.arrayBuffer());
    // Derive the MIME type from the stored blob / extension — never hardcode it.
    const ext = file_path.split(".").pop()?.toLowerCase() || "";
    const mime =
      blob.type && blob.type !== "application/octet-stream"
        ? blob.type
        : ext === "pdf"
        ? "application/pdf"
        : ext === "png"
        ? "image/png"
        : ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : "application/octet-stream";
    if (!["application/pdf", "image/png", "image/jpeg"].includes(mime)) {
      return json({ error: "Unsupported file type" }, 400);
    }

    const dataUrl = `data:${mime};base64,${toBase64(bytes)}`;
    const fileName = file_path.split("/").pop() || "document";

    const instruction =
      "Read this pension statement and extract ONLY these fields as json: " +
      "current_balance (number, the total pension account balance), " +
      "last_contribution_date (string, ISO date YYYY-MM-DD of the most recent contribution), " +
      "pfa_name (string, the pension fund administrator's name). " +
      "Return strict json with exactly these three keys. If a field is not clearly present in " +
      "the document, return null for it. Never guess, infer, or estimate a number that is not " +
      "printed in the document. Do not include any other keys or commentary.";

    const contentPart =
      mime === "application/pdf"
        ? { type: "file", file: { filename: fileName, file_data: dataUrl } }
        : { type: "image_url", image_url: { url: dataUrl } };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a careful document data extractor. You only report values printed in the " +
              "document and return null for anything missing. You always reply with valid json.",
          },
          { role: "user", content: [{ type: "text", text: instruction }, contentPart] },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return json({ error: "Rate limit reached. Please try again shortly." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
      console.error("AI gateway error:", aiRes.status, await aiRes.text());
      return json({ error: "Could not read the document. You can enter the numbers manually." }, 502);
    }

    const aiJson = await aiRes.json();
    const text: string = aiJson?.choices?.[0]?.message?.content ?? "";

    let extracted: Record<string, unknown> = {};
    try {
      extracted = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          extracted = JSON.parse(m[0]);
        } catch { /* fall through to nulls */ }
      }
    }

    const num = (v: unknown) => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(String(v).replace(/[^\d.\-]/g, ""));
      return Number.isFinite(n) ? n : null;
    };
    const dateStr = (v: unknown) => {
      if (!v || typeof v !== "string") return null;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    };
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : null);

    return json({
      current_balance: num(extracted.current_balance),
      last_contribution_date: dateStr(extracted.last_contribution_date),
      pfa_name: str(extracted.pfa_name),
    });
  } catch (e) {
    console.error("parse-pension-document error:", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
