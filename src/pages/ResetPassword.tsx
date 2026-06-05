import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, AlertTriangle } from "lucide-react";

type Status = "checking" | "ready" | "invalid";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setStatus("ready");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "ready" : "invalid");
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated", description: "You're now signed in." });
      navigate("/auth/callback");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-primary">Reignite 🔥</h1>
        </div>
        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle className="text-lg">
              {status === "invalid" ? "Link expired" : "Set a new password"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status === "checking" && (
              <p className="text-sm text-muted-foreground py-4 text-center">Verifying link…</p>
            )}

            {status === "invalid" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                  <p className="text-sm">
                    This reset link is invalid or has expired. Reset links are valid for one hour.
                  </p>
                </div>
                <Button className="w-full" onClick={() => navigate("/forgot-password")}>
                  Request a new link
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => navigate("/auth")}>
                  Back to sign in
                </Button>
              </div>
            )}

            {status === "ready" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="ps-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="ps-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Updating..." : "Update password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
