import { useEffect, useState } from "react";
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

export function useDashboardData() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [ideas, setIdeas] = useState<BusinessIdea[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      setLoading(true);

      const [profileRes, reportRes, ideasRes, metricsRes, eventsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("ai_reports").select("*").eq("user_id", user.id).order("generated_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("business_ideas").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("user_metrics").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("events_announcements").select("*").eq("is_active", true).order("date", { ascending: true }).limit(10),
      ]);

      if (profileRes.data) {
        const p = profileRes.data;
        setProfile({
          fullName: p.full_name || "User",
          age: p.age || 0,
          yearsInService: p.years_in_service || 0,
          gradeLevel: p.grade_level || "",
          sector: p.sector || "",
          currentSalary: p.current_salary || 0,
          pensionProjection: p.pension_projection || 0,
          skills: Array.isArray(p.skills) ? (p.skills as string[]) : [],
          businessInterests: Array.isArray(p.business_interests) ? (p.business_interests as string[]) : [],
        });
      }

      if (reportRes.data) {
        const r = reportRes.data;
        const json = r.report_json as Record<string, Json> | null;
        setReport({
          readinessScore: r.readiness_score || 0,
          pensionGap: Number(r.pension_gap) || 0,
          inflationNote: (json?.inflationNote as string) || "Inflation may reduce your pension's purchasing power over time.",
          topIdeas: Array.isArray(json?.topIdeas) ? (json.topIdeas as any[]) : [],
          nextSteps: Array.isArray(json?.nextSteps) ? (json.nextSteps as string[]) : [],
        });
      }

      if (ideasRes.data) {
        setIdeas(
          ideasRes.data.map((idea) => ({
            id: idea.id,
            title: idea.idea_title,
            description: idea.description || "",
            projectedIncome: Number(idea.projected_monthly_income) || 0,
            status: idea.status || "idea",
            gammaDeckUrl: idea.gamma_deck_url,
          }))
        );
      }

      if (metricsRes.data) {
        const m = metricsRes.data;
        setMetrics({
          sideIncome: Number(m.side_income) || 0,
          businessesLaunched: m.businesses_launched || 0,
          studentsEnrolled: m.students_enrolled || 0,
          anxietyScore: m.anxiety_score || 50,
        });
      }

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

  return { profile, report, ideas, metrics, events, loading };
}
