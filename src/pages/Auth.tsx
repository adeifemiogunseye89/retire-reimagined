import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Lock, User } from "lucide-react";
import CheckInboxCard from "@/components/auth/CheckInboxCard";

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get("mode");
  const next = params.get("next");
  const callbackPath = next ? `/auth/callback?next=${encodeURIComponent(next)}` : "/auth/callback";
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(mode === "signup");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNeedsVerification(false);

    try {
      if (isSignUp) {
        // Basic client-side email sanity check (server silently accepts some malformed inputs).
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error("Please enter a valid email address.");
        }
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        // Supabase returns identities: [] when the email is already registered
        // (privacy-preserving). Detect and route the user to sign-in instead of
        // showing a misleading "check your inbox" state.
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          toast({
            title: "Email already registered",
            description: "Try signing in, or reset your password if you've forgotten it.",
            variant: "destructive",
          });
          setIsSignUp(false);
          setPassword("");
          return;
        }
        setAwaitingConfirm(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // Surface the unconfirmed-email case with a clear CTA instead of a raw error.
          if (/confirm/i.test(error.message)) {
            setNeedsVerification(true);
          }
          throw error;
        }
        navigate(callbackPath);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      toast({ title: "Verification email resent", description: `Check ${email}.` });
    } catch (e: any) {
      toast({ title: "Couldn't resend", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-primary">Reignite 🔥</h1>
          <p className="text-muted-foreground mt-1">Your second career starts here</p>
        </div>

        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle className="text-lg">
              {awaitingConfirm
                ? "One last step"
                : isSignUp
                ? "Create your account"
                : "Welcome back"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {awaitingConfirm ? (
              <>
                <CheckInboxCard
                  email={email}
                  kind="signup"
                  onChangeEmail={() => {
                    setAwaitingConfirm(false);
                    setPassword("");
                  }}
                />
                <div className="mt-4">
                  <Button variant="ghost" size="sm" onClick={() => { setAwaitingConfirm(false); setIsSignUp(false); }} className="w-full">
                    Back to sign in
                  </Button>
                </div>
              </>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isSignUp && (
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="name"
                          placeholder="e.g. Mrs. Funke Adebanjo"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
                  </Button>
                </form>

                {needsVerification && !isSignUp && (
                  <div className="mt-3 p-3 rounded-lg bg-muted text-sm space-y-2">
                    <p>This email isn't verified yet.</p>
                    <Button type="button" variant="outline" size="sm" onClick={resendVerification} className="w-full">
                      Resend verification email
                    </Button>
                  </div>
                )}

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    const result = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: `${window.location.origin}${callbackPath}`,
                    });
                    if (result.error) {
                      const msg = result.error.message || "";
                      // Common provider-collision case: email already exists under another method.
                      if (/already|exists|registered/i.test(msg)) {
                        toast({
                          title: "Email already registered",
                          description: "Sign in with your password, then link Google from Security settings.",
                          variant: "destructive",
                        });
                      } else {
                        toast({ title: "Google sign-in failed", description: msg, variant: "destructive" });
                      }
                    }
                  }}
                >
                  Continue with Google
                </Button>

                {!isSignUp && (
                  <div className="mt-3 text-center text-sm">
                    <Link to="/forgot-password" className="text-primary hover:underline">
                      Forgot your password?
                    </Link>
                  </div>
                )}

                <div className="mt-4 text-center text-sm">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-primary hover:underline"
                  >
                    {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                  </button>
                </div>

                <div className="mt-4">
                  <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to home
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
