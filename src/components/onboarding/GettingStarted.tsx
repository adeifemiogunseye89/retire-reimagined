import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Sparkles, X, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ProfileData, ReportData } from "@/hooks/useDashboardData";

interface Props {
  profile: ProfileData | null;
  report: ReportData | null;
  ideaCount: number;
  /** Switches the dashboard to another tab so a step can be completed in place. */
  onNavigate: (tab: "report" | "ideas" | "plan" | "productivity" | "metrics" | "tips") => void;
}

type Step = {
  id: string;
  title: string;
  blurb: string;
  done: boolean;
  action: { label: string; onClick?: () => void; to?: string };
};

/**
 * First-run guidance. A lightweight checklist that shows a new user the shortest
 * path to their first useful result, then points them at the next best feature.
 * Nothing is forced: the card can be dismissed and disappears once every step is
 * complete. Purely additive — no existing data or logic is touched.
 */
const GettingStarted = ({ profile, report, ideaCount, onNavigate }: Props) => {
  const { user } = useAuth();
  const dismissKey = user ? `reignite:getting-started:dismissed:${user.id}` : null;
  const [dismissed, setDismissed] = useState(false);
  const [goalCount, setGoalCount] = useState<number | null>(null);
  const [docCount, setDocCount] = useState<number | null>(null);
  const [chatCount, setChatCount] = useState<number | null>(null);

  useEffect(() => {
    if (dismissKey) setDismissed(localStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  // Lightweight head-only counts: just enough to tick the checklist boxes.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [goals, docs, chats] = await Promise.all([
        supabase.from("retirement_goals").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_documents").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      if (cancelled) return;
      setGoalCount(goals.count ?? 0);
      setDocCount(docs.count ?? 0);
      setChatCount(chats.count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const steps: Step[] = [
    {
      id: "profile",
      title: "Tell us about your work and money",
      blurb: "A few basics — age, pay, and what you spend each month — is all we need to start.",
      done: !!profile && profile.currentSalary > 0,
      action: { label: "Open your details", to: "/profile" },
    },
    {
      id: "report",
      title: "See your retirement readiness",
      blurb: "Your readiness score and monthly shortfall, with the assumptions shown alongside them.",
      done: !!report,
      action: { label: "View your report", onClick: () => onNavigate("report") },
    },
    {
      id: "ideas",
      title: "Add one way to earn more",
      blurb: "Pick or add a single income idea. We'll show how much of your shortfall it could cover.",
      done: ideaCount > 0,
      action: { label: "Explore income ideas", onClick: () => onNavigate("ideas") },
    },
    {
      id: "goal",
      title: "Set your first savings goal",
      blurb: "One clear target makes progress visible month after month.",
      done: (goalCount ?? 0) > 0,
      action: { label: "Set a goal", onClick: () => onNavigate("plan") },
    },
    {
      id: "coach",
      title: "Ask your coach one question",
      blurb: "Your coach knows your numbers, so answers are about you — not general advice.",
      done: (chatCount ?? 0) > 0,
      action: { label: "Scroll down to chat", onClick: () => document.getElementById("coach-card")?.scrollIntoView({ behavior: "smooth" }) },
    },
    {
      id: "documents",
      title: "Upload your pension statement (optional)",
      blurb: "We read the balance for you so your projection uses real figures instead of estimates.",
      done: (docCount ?? 0) > 0,
      action: { label: "Upload a statement", to: "/profile" },
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = completed === total;
  const next = steps.find((s) => !s.done);

  if (dismissed || allDone) return null;

  const dismiss = () => {
    if (dismissKey) localStorage.setItem(dismissKey, "1");
    setDismissed(true);
  };

  return (
    <Card className="border-primary/25 bg-primary/[0.03] shadow-warm">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading font-semibold text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Your first steps
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Take these at your own pace. You can look around freely — this is simply the quickest route
              to a plan you can trust.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground shrink-0"
            onClick={dismiss}
            aria-label="Hide the first steps checklist"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress indicator — always answers "where am I?" */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Step {Math.min(completed + 1, total)} of {total}</span>
            <span className="font-semibold text-primary tabular-nums">{completed}/{total} done</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>

        <ul className="space-y-2.5">
          {steps.map((s) => {
            const isNext = next?.id === s.id;
            return (
              <li
                key={s.id}
                className={`flex items-start gap-3 rounded-lg p-2.5 transition-colors ${
                  isNext ? "bg-card border border-primary/30" : ""
                }`}
              >
                {s.done ? (
                  <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                ) : (
                  <Circle className={`h-4 w-4 mt-0.5 shrink-0 ${isNext ? "text-primary" : "text-muted-foreground/50"}`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${s.done ? "text-muted-foreground line-through" : ""}`}>
                    {s.title}
                  </p>
                  {!s.done && <p className="text-xs text-muted-foreground mt-0.5">{s.blurb}</p>}
                  {isNext && (
                    s.action.to ? (
                      <Button asChild size="sm" className="mt-2 h-7 text-xs">
                        <Link to={s.action.to}>
                          {s.action.label} <ArrowRight className="h-3 w-3 ms-1" />
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" className="mt-2 h-7 text-xs" onClick={s.action.onClick}>
                        {s.action.label} <ArrowRight className="h-3 w-3 ms-1" />
                      </Button>
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};

export default GettingStarted;
