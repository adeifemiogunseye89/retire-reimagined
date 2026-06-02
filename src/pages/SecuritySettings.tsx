import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Mail, KeyRound, Link2, Unlink, Loader2 } from "lucide-react";
import type { UserIdentity } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const providerLabel: Record<string, string> = {
  email: "Email & Password",
  google: "Google",
  apple: "Apple",
};

const ProviderIcon = ({ provider }: { provider: string }) => {
  if (provider === "email") return <Mail className="h-4 w-4" />;
  return <Link2 className="h-4 w-4" />;
};

/**
 * Lets the user see every identity (email, google, …) linked to their account,
 * link a new provider, unlink an existing one (when ≥2 remain), and trigger a
 * password reset for the email identity.
 */
const SecuritySettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.getUserIdentities();
    if (!error && data) setIdentities(data.identities);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const linkedProviders = new Set(identities.map((i) => i.provider));
  const canUnlink = identities.length > 1;

  const linkGoogle = async () => {
    setBusyProvider("google");
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/profile/security` },
      });
      if (error) throw error;
    } catch (e: any) {
      toast({ title: "Couldn't link Google", description: e.message, variant: "destructive" });
    } finally {
      setBusyProvider(null);
    }
  };

  const unlink = async (identity: UserIdentity) => {
    if (!canUnlink) {
      toast({
        title: "Can't unlink your only sign-in method",
        description: "Link another provider first, otherwise you'd be locked out.",
        variant: "destructive",
      });
      return;
    }
    setBusyProvider(identity.provider);
    try {
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) throw error;
      toast({ title: "Unlinked", description: `${providerLabel[identity.provider] ?? identity.provider} removed.` });
      refresh();
    } catch (e: any) {
      toast({ title: "Couldn't unlink", description: e.message, variant: "destructive" });
    } finally {
      setBusyProvider(null);
    }
  };

  const sendPasswordReset = async () => {
    if (!user?.email) return;
    setBusyProvider("password");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "Reset email sent", description: `Check ${user.email} for the link.` });
    } catch (e: any) {
      toast({ title: "Couldn't send reset", description: e.message, variant: "destructive" });
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="gradient-hero text-primary-foreground py-4">
        <div className="container max-w-2xl px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate("/profile")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-heading font-bold flex items-center gap-2">
              <Shield className="h-5 w-5" /> Security & Linked Accounts
            </h1>
            <p className="text-xs opacity-80">Manage how you sign in</p>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl px-4 py-8 space-y-6">
        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle className="text-base">Sign-in methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <>
                {identities.map((id) => (
                  <div
                    key={id.identity_id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <ProviderIcon provider={id.provider} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {providerLabel[id.provider] ?? id.provider}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(id.identity_data as any)?.email ?? user?.email}
                          {id.created_at && (
                            <> · linked {new Date(id.created_at).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unlink(id)}
                      disabled={!canUnlink || busyProvider === id.provider}
                      title={canUnlink ? "Unlink this provider" : "Add another method before unlinking"}
                    >
                      <Unlink className="h-4 w-4 mr-1" /> Unlink
                    </Button>
                  </div>
                ))}

                {!linkedProviders.has("google") && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={linkGoogle}
                    disabled={busyProvider === "google"}
                  >
                    <Link2 className="h-4 w-4 mr-2" /> Link Google account
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {linkedProviders.has("email") && (
          <Card className="shadow-warm">
            <CardHeader>
              <CardTitle className="text-base">Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                We'll email a secure link to <strong>{user?.email}</strong> so you can set a new password.
              </p>
              <Button
                variant="outline"
                onClick={sendPasswordReset}
                disabled={busyProvider === "password"}
              >
                <KeyRound className="h-4 w-4 mr-2" />
                {busyProvider === "password" ? "Sending…" : "Send password reset email"}
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground px-1">
          Tip: linking Google lets you skip passwords next time. We never post anything to your Google account.
        </p>
      </div>
    </div>
  );
};

export default SecuritySettings;
