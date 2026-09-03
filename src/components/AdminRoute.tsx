import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Route guard for /admin/* pages.
 *
 * The authoritative check is server-side: `public.has_role` is a SECURITY DEFINER
 * function evaluated in Postgres against the caller's JWT, and every admin RPC
 * (admin_metrics, admin_list_users, admin_observability, admin_set_role) re-checks
 * the role itself. This component only prevents the page from mounting for
 * non-admins — it is a UX guard, not the security boundary. Data stays protected
 * by RLS + the RPC role checks even if this guard were bypassed in the browser.
 */
export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    let cancelled = false;
    if (loading) return;
    if (!user) { setState("denied"); return; }
    setState("checking");
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data, error }) => {
        if (cancelled) return;
        setState(!error && data === true ? "allowed" : "denied");
      });
    return () => { cancelled = true; };
  }, [user, loading]);

  if (loading || state === "checking") {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (state === "denied") {
    if (!user) {
      const next = window.location.pathname + window.location.search;
      return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};
