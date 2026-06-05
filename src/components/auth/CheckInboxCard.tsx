import { useEffect, useState } from "react";
import { MailCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  email: string;
  /** "signup" | "recovery" — controls which Supabase resend type to use. */
  kind: "signup" | "recovery";
  onChangeEmail?: () => void;
}

const RESEND_COOLDOWN = 30;

/**
 * "Check your inbox" confirmation state shown after a signup or password-reset
 * email is dispatched. Includes a throttled resend and a "wrong email" escape hatch.
 */
const CheckInboxCard = ({ email, kind, onChangeEmail }: Props) => {
  const { toast } = useToast();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    setResending(true);
    try {
      if (kind === "signup") {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
      }
      toast({ title: "Email resent", description: `We sent another link to ${email}.` });
      setCooldown(RESEND_COOLDOWN);
    } catch (e: any) {
      toast({ title: "Couldn't resend", description: e.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const title = kind === "signup" ? "Confirm your email" : "Check your inbox";
  const body =
    kind === "signup"
      ? "We sent a confirmation link to"
      : "If an account exists, we sent a password reset link to";

  return (
    <div className="text-center space-y-4 py-2">
      <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
        <MailCheck className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h3 className="text-base font-heading font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {body} <strong className="text-foreground">{email}</strong>.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Open the link from this device. Check your spam folder if you don't see it.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 me-1 ${resending ? "animate-spin" : ""}`} />
          {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Sending…" : "Resend email"}
        </Button>
        {onChangeEmail && (
          <button
            type="button"
            onClick={onChangeEmail}
            className="text-xs text-primary hover:underline"
          >
            Wrong email? Use a different one
          </button>
        )}
      </div>
    </div>
  );
};

export default CheckInboxCard;
