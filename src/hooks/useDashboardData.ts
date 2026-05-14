import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export interface ProfileData {
  fullName: string;
  age: number;
  yearsInService: number;
  gradeLevel: string;
  sector: string;
  currentSalary: number;
  pensionProjection: number;
  skills: string[];
  businessInterests: string[];
  country: string;
  currency: string;
  language: string;
  region: string | null;
  monthlyExpenses: number | null;
  dependents: number | null;
}

export interface BusinessIdea {
  id: string;
  title: string;
  description: string;
  projectedIncome: number;
  status: string;
  gammaDeckUrl: string | null;
}

export interface ReportData {
  readinessScore: number;
  pensionGap: number;
  inflationNote: string;
  topIdeas: { title: string; description: string; projectedIncome: number }[];
  nextSteps: string[];
}

export interface MetricsData {
  sideIncome: number;
  businessesLaunched: number;
  studentsEnrolled: number;
  anxietyScore: number;
}

export interface EventData {
  id: string;
  title: string;
  type: string;
  date: string;
  description: string;
  link: string | null;
}

export interface SavingsPlanData {
  monthlySavingsTarget: number;
  emergencyFundGoal: number;
  desiredRetirementIncome: number;
  businessIncomeProjection: number;
  currentSavings: number;
  yearsHorizon: number;
  lastInflationRate: number | null;
  lastInflationCheck: string | null;
  aiRecommendations: Json | null;
}

export function useDashboardData() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [ideas, setIdeas] = useState<BusinessIdea[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [savingsPlan, setSavingsPlan] = useState<SavingsPlanData | null>(null);
  const [savingsPlanUpdatedAt, setSavingsPlanUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const mapIdea = (idea: any): BusinessIdea => ({
    id: idea.id,
    title: idea.idea_title,
    description: idea.description || "",
    projectedIncome: Number(idea.projected_monthly_income) || 0,
    status: idea.status || "idea",
    gammaDeckUrl: idea.gamma_deck_url,
  });

  const mapSavingsPlan = (s: any): SavingsPlanData => ({
    monthlySavingsTarget: Number(s.monthly_savings_target) || 0,
    emergencyFundGoal: Number(s.emergency_fund_goal) || 0,
    desiredRetirementIncome: Number(s.desired_retirement_income) || 0,
    businessIncomeProjection: Number(s.business_income_projection) || 0,
    currentSavings: Number(s.current_savings) || 0,
    yearsHorizon: s.years_horizon || 5,
    lastInflationRate: s.last_inflation_rate ? Number(s.last_inflation_rate) : null,
    lastInflationCheck: s.last_inflation_check,
    aiRecommendations: s.ai_recommendations,
  });

  const mapMetrics = (m: any): MetricsData => ({
    sideIncome: Number(m.side_income) || 0,
    businessesLaunched: m.businesses_launched || 0,
    studentsEnrolled: m.students_enrolled || 0,
    anxietyScore: m.anxiety_score || 50,
  });

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      setLoading(true);

      const [profileRes, reportRes, ideasRes, metricsRes, eventsRes, planRes] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", user.id).single(),
          supabase
            .from("ai_reports")
            .select("*")
            .eq("user_id", user.id)
            .order("generated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("business_ideas")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase.from("user_metrics").select("*").eq("user_id", user.id).maybeSingle(),
          supabase
            .from("events_announcements")
            .select("*")
            .eq("is_active", true)
            .order("date", { ascending: true })
            .limit(10),
          supabase.from("savings_plans").select("*").eq("user_id", user.id).maybeSingle(),
        ]);

      if (profileRes.data) {
        const p = profileRes.data as any;
        setProfile({
          fullName: p.full_name || "User",
          age: p.age || 0,
          yearsInService: p.years_in_service || 0,
          gradeLevel: p.grade_level || "",
          sector: p.sector || "",
          currentSalary: p.current_salary || 0,
          pensionProjection: p.pension_projection || 0,
          skills: Array.isArray(p.skills) ? (p.skills as string[]) : [],
          businessInterests: Array.isArray(p.business_interests)
            ? (p.business_interests as string[])
            : [],
          country: p.country || "NG",
          currency: p.currency || "NGN",
          language: p.language || "en-NG",
          region: p.region || null,
          monthlyExpenses: p.monthly_expenses ?? null,
          dependents: p.dependents ?? null,
        });
      }

      if (reportRes.data) {
        const r = reportRes.data;
        const json = r.report_json as Record<string, Json> | null;
        setReport({
          readinessScore: r.readiness_score || 0,
          pensionGap: Number(r.pension_gap) || 0,
          inflationNote:
            (json?.inflationNote as string) ||
            "Inflation may reduce your pension's purchasing power over time.",
          topIdeas: Array.isArray(json?.topIdeas) ? (json.topIdeas as any[]) : [],
          nextSteps: Array.isArray(json?.nextSteps) ? (json.nextSteps as string[]) : [],
        });
      }

      if (ideasRes.data) setIdeas(ideasRes.data.map(mapIdea));
      if (metricsRes.data) setMetrics(mapMetrics(metricsRes.data));
      if (planRes.data) setSavingsPlan(mapSavingsPlan(planRes.data));

      if (eventsRes.data) {
        setEvents(
          eventsRes.data.map((e) => ({
            id: e.id,
            title: e.title,
            type: e.type || "event",
            date: e.date,
            description: e.description || "",
            link: e.link,
          }))
        );
      }

      setLoading(false);
    };

    fetchAll();
  }, [user]);

  // Realtime subscriptions for savings_plans, business_ideas, user_metrics
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`dashboard-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "savings_plans",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setSavingsPlan(null);
          } else if (payload.new) {
            setSavingsPlan(mapSavingsPlan(payload.new));
          }
          setSavingsPlanUpdatedAt(Date.now());
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "business_ideas",
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("business_ideas")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          if (data) setIdeas(data.map(mapIdea));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_metrics",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) setMetrics(mapMetrics(payload.new));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const refetchIdeas = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("business_ideas")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setIdeas(data.map(mapIdea));
  }, [user]);

  const refetchSavingsPlan = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("savings_plans")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setSavingsPlan(mapSavingsPlan(data));
  }, [user]);

  return {
    profile,
    report,
    ideas,
    metrics,
    events,
    savingsPlan,
    savingsPlanUpdatedAt,
    loading,
    refetchIdeas,
    refetchSavingsPlan,
  };
}
