import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Post-login landing page. Decides whether the user goes through onboarding
 * or straight to the dashboard, instead of forcing everyone through /assessment.
 *
 * Honors a ?next= param so ProtectedRoute can bounce users back to where they came from.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth", { replace: true });
        return;
      }

      const next = params.get("next");
      if (next && next.startsWith("/")) {
        navigate(next, { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("assessment_completed_at, full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const completed = (profile as any)?.assessment_completed_at;
      navigate(completed ? "/dashboard" : "/assessment", { replace: true });
    })();
  }, [navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin me-2" /> Signing you in…
    </div>
  );
};

export default AuthCallback;
