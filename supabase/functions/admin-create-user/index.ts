import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Admin-only user provisioning.
 *
 * Lets an existing admin create a new account (with an optional admin/moderator
 * role) or send an invite email, without anybody touching the database.
 * The caller's admin role is verified server-side via public.has_role().
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: authError } = await admin.auth.getUser(token);
    if (authError || !userData?.user) return json({ error: "Unauthorized" }, 401);

    // Authoritative role check (SECURITY DEFINER function in Postgres).
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (isAdmin !== true) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = body.password ? String(body.password) : "";
    const fullName = String(body.full_name || "").trim();
    const role = body.role === "admin" || body.role === "moderator" ? body.role : "user";
    const invite = body.invite === true;

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Invalid email" }, 400);
    if (!invite && password.length < 8) {
      return json({ error: "Password must be at least 8 characters" }, 400);
    }

    let newUserId: string | undefined;

    if (invite) {
      const redirectTo = (Deno.env.get("APP_URL") || "").replace(/\/$/, "");
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
        redirectTo: redirectTo ? `${redirectTo}/auth/callback` : undefined,
      });
      if (error) return json({ error: error.message }, 400);
      newUserId = data.user?.id;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error) return json({ error: error.message }, 400);
      newUserId = data.user?.id;
    }

    if (newUserId && role !== "user") {
      const { error: roleError } = await admin
        .from("user_roles")
        .insert({ user_id: newUserId, role });
      if (roleError && !roleError.message.includes("duplicate")) {
        return json({ error: `User created but role failed: ${roleError.message}` }, 500);
      }
    }

    return json({ ok: true, user_id: newUserId, invited: invite });
  } catch (e) {
    console.error("admin-create-user error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
