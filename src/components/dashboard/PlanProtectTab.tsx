import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import BudgetEstimator from "./BudgetEstimator";
import {
  TrendingUp,
  Sparkles,
  RefreshCw,
  Save,
  ShieldCheck,
  Lightbulb,
  Bell,
  Loader2,
  Wand2,
  Calculator,
  Radio,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type {
  ProfileData,
  ReportData,
  BusinessIdea,
  SavingsPlanData,
} from "@/hooks/useDashboardData";
import { formatMoney, getCountry, currencyRange } from "@/lib/regions";

interface Props {
  profile: ProfileData | null;
  report: ReportData | null;
  ideas: BusinessIdea[];
  savingsPlan: SavingsPlanData | null;
  savingsPlanUpdatedAt?: number | null;
  onPlanSaved: () => void;
}

type Analysis = {
  inflation_rate: number;
  inflation_source_note: string;
  real_value_today: number;
  nominal_projected_value: number;
  inflation_gap_naira: number;
  inflation_gap_percent: number;
  headline_message: string;
  smart_recommendation: string;
  what_to_prepare_for: string;
  adjust_your_plan: string;
  new_developments_alert: string;
  yearly_projection: { year: number; nominal: number; real: number }[];
};

const PlanProtectTab = ({
  profile,
  report,
  ideas,
  savingsPlan,
  savingsPlanUpdatedAt,
  onPlanSaved,
}: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const fmt = (n: number) =>
    formatMoney(n, profile?.currency, profile?.language);
  const country = getCountry(profile?.country);
  const monthlyRange = currencyRange(country.currency, 0, 500000, 1000);
  const emergencyRange = currencyRange(country.currency, 0, 5000000, 10000);
  const incomeRange = currencyRange(country.currency, 0, 1000000, 5000);
  // Compact axis tick using locale-aware Intl with currency symbol
  const compactFmt = (n: number) => {
    try {
      return new Intl.NumberFormat(profile?.language || country.locale, {
        style: "currency",
        currency: country.currency,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n || 0);
    } catch {
      return fmt(n);
    }
  };

  const businessTotal = ideas.reduce(
    (sum, i) => sum + (i.projectedIncome || 0),
    0
  );

  const [monthlySavings, setMonthlySavings] = useState(
    savingsPlan?.monthlySavingsTarget ?? 25000
  );
  const [emergencyGoal, setEmergencyGoal] = useState(
    savingsPlan?.emergencyFundGoal ?? 500000
  );
  const [retirementIncome, setRetirementIncome] = useState(
    savingsPlan?.desiredRetirementIncome ?? 250000
  );
  const [businessProjection, setBusinessProjection] = useState(
    savingsPlan?.businessIncomeProjection ?? businessTotal
  );
  const [currentSavings, setCurrentSavings] = useState(
    savingsPlan?.currentSavings ?? 0
  );
  const [yearsHorizon, setYearsHorizon] = useState(
    savingsPlan?.yearsHorizon ?? 5
  );

  const [analysis, setAnalysis] = useState<Analysis | null>(
    (savingsPlan?.aiRecommendations as Analysis) ?? null
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(
    savingsPlan?.lastInflationCheck ?? null
  );

  // Sync with realtime updates
  useEffect(() => {
    if (savingsPlan?.aiRecommendations) {
      setAnalysis(savingsPlan.aiRecommendations as Analysis);
      setLastChecked(savingsPlan.lastInflationCheck);
    }
  }, [savingsPlan?.aiRecommendations, savingsPlan?.lastInflationCheck]);

  // Realtime sync indicator — flashes when an update arrives from another device/tab
  const [justSynced, setJustSynced] = useState(false);
  const isFirstSyncRef = useState({ current: true })[0];
  useEffect(() => {
    if (!savingsPlanUpdatedAt) return;
    if (isFirstSyncRef.current) {
      isFirstSyncRef.current = false;
      return;
    }
    setJustSynced(true);
    toast({
      title: "Plan updated",
      description: "Synced live from another device.",
    });
    const t = setTimeout(() => setJustSynced(false), 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savingsPlanUpdatedAt]);

  // Reflect realtime field updates into local form state when they change
  useEffect(() => {
    if (!savingsPlan) return;
    setMonthlySavings(savingsPlan.monthlySavingsTarget);
    setEmergencyGoal(savingsPlan.emergencyFundGoal);
    setRetirementIncome(savingsPlan.desiredRetirementIncome);
    setBusinessProjection(savingsPlan.businessIncomeProjection);
    setCurrentSavings(savingsPlan.currentSavings);
    setYearsHorizon(savingsPlan.yearsHorizon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savingsPlanUpdatedAt]);

  const useReportData = () => {
    if (report) {
      setRetirementIncome(
        Math.max(retirementIncome, (profile?.currentSalary || 0) * 0.7)
      );
    }
    if (profile?.currentSalary) {
      setMonthlySavings(Math.round(profile.currentSalary * 0.15));
      setEmergencyGoal(profile.currentSalary * 6);
    }
    setBusinessProjection(businessTotal);
    toast({ title: "Loaded from your AI report ✨" });
  };

  const savePlan = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      monthly_savings_target: monthlySavings,
      emergency_fund_goal: emergencyGoal,
      desired_retirement_income: retirementIncome,
      business_income_projection: businessProjection,
      current_savings: currentSavings,
      years_horizon: yearsHorizon,
    };
    const { error } = await supabase
      .from("savings_plans")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({
        title: "Could not save plan",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Plan saved 💚" });
    onPlanSaved();
  }, [
    user,
    monthlySavings,
    emergencyGoal,
    retirementIncome,
    businessProjection,
    currentSavings,
    yearsHorizon,
    toast,
    onPlanSaved,
  ]);

  const runAnalysis = async () => {
    if (!user) return;
    setAnalyzing(true);
    try {
      // Save first so the edge function reads fresh data
      await supabase.from("savings_plans").upsert(
        {
          user_id: user.id,
          monthly_savings_target: monthlySavings,
          emergency_fund_goal: emergencyGoal,
          desired_retirement_income: retirementIncome,
          business_income_projection: businessProjection,
          current_savings: currentSavings,
          years_horizon: yearsHorizon,
        },
        { onConflict: "user_id" }
      );

      const { data: { session } } = await supabase.auth.getSession();
      const token =
        session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inflation-analysis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            monthly_savings_target: monthlySavings,
            current_savings: currentSavings,
            desired_retirement_income: retirementIncome,
            business_income_projection: businessProjection,
            emergency_fund_goal: emergencyGoal,
            years_horizon: yearsHorizon,
            pension_projection: profile?.pensionProjection || 0,
            current_salary: profile?.currentSalary || 0,
            country: country.code,
            country_name: country.name,
            currency: country.currency,
            locale: country.locale,
            inflation_hint: country.inflation,
            business_ideas: ideas.map((i) => ({
              title: i.title,
              projectedIncome: i.projectedIncome,
            })),
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${resp.status})`);
      }

      const result: Analysis = await resp.json();
      setAnalysis(result);
      setLastChecked(new Date().toISOString());
      onPlanSaved();
      toast({ title: "Plan analyzed against live inflation 🔥" });
    } catch (e) {
      toast({
        title: "Analysis failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const lastCheckedLabel = lastChecked
    ? new Date(lastChecked).toLocaleString(profile?.language || "en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Never — run an analysis";

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-heading font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Plan & Protect
          </h2>
          <p className="text-sm text-muted-foreground">
            Defend your future purchasing power against inflation.
          </p>
        </div>
        <Badge
          variant="outline"
          className={`gap-1.5 transition-all duration-500 ${
            justSynced
              ? "border-primary bg-primary/10 text-primary animate-pulse shadow-warm"
              : "border-muted-foreground/30 text-muted-foreground"
          }`}
        >
          <Radio
            className={`h-3 w-3 ${justSynced ? "text-primary" : ""}`}
          />
          {justSynced ? "Synced just now" : "Live sync on"}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="overview" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="budget" className="gap-1.5">
            <Calculator className="h-3.5 w-3.5" />
            Budget Estimator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5 mt-5">
      {/* Setup Panel */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-heading">
              Savings & Budget Setup
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={useReportData}
              className="gap-1.5"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Use My AI Report Data
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SliderField
              label="Monthly savings target"
              value={monthlySavings}
              onChange={setMonthlySavings}
              min={monthlyRange.min}
              max={monthlyRange.max}
              step={monthlyRange.step}
              format={fmt}
            />
            <SliderField
              label="Emergency fund goal"
              value={emergencyGoal}
              onChange={setEmergencyGoal}
              min={emergencyRange.min}
              max={emergencyRange.max}
              step={emergencyRange.step}
              format={fmt}
            />
            <SliderField
              label="Desired post-retirement monthly income"
              value={retirementIncome}
              onChange={setRetirementIncome}
              min={incomeRange.min}
              max={incomeRange.max}
              step={incomeRange.step}
              format={fmt}
            />
            <SliderField
              label="Business income projection (monthly)"
              value={businessProjection}
              onChange={setBusinessProjection}
              min={incomeRange.min}
              max={incomeRange.max}
              step={incomeRange.step}
              format={fmt}
              hint={
                businessTotal > 0
                  ? `Auto-pulled from ideas: ${fmt(businessTotal)}`
                  : undefined
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="current-savings" className="text-xs">
                Current savings ({country.currency})
              </Label>
              <Input
                id="current-savings"
                type="number"
                value={currentSavings}
                onChange={(e) =>
                  setCurrentSavings(Number(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="years" className="text-xs">
                Planning horizon (years)
              </Label>
              <Input
                id="years"
                type="number"
                min={1}
                max={30}
                value={yearsHorizon}
                onChange={(e) =>
                  setYearsHorizon(Math.min(30, Math.max(1, Number(e.target.value) || 1)))
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={savePlan}
              disabled={saving}
              variant="outline"
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Plan
            </Button>
            <Button
              onClick={runAnalysis}
              disabled={analyzing}
              className="gap-1.5 gradient-hero text-primary-foreground"
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {analysis ? "Re-analyze with live inflation" : "Analyze my plan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inflation Dashboard */}
      {analysis ? (
        <Card className="overflow-hidden border-2 border-primary/30">
          <div className="gradient-hero p-5 text-primary-foreground">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <h3 className="font-heading font-semibold">
                  Your plan vs. inflation
                </h3>
              </div>
              <Badge
                variant="secondary"
                className="bg-primary-foreground/20 text-primary-foreground border-0"
              >
                {analysis.inflation_rate.toFixed(1)}% inflation
              </Badge>
            </div>
            <p className="text-sm opacity-90 leading-relaxed">
              {analysis.headline_message}
            </p>
            <p className="text-[11px] opacity-70 mt-2">
              {analysis.inflation_source_note} • Updated {lastCheckedLabel}
            </p>
          </div>

          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat
                label="Nominal value"
                value={fmt(analysis.nominal_projected_value)}
                sub={`in ${yearsHorizon} years`}
              />
              <Stat
                label="Real value (today's money)"
                value={fmt(analysis.real_value_today)}
                sub="purchasing power"
                accent
              />
              <Stat
                label="Monthly gap"
                value={fmt(analysis.inflation_gap_naira)}
                sub={`${analysis.inflation_gap_percent.toFixed(0)}% short`}
                warning
              />
            </div>

            {analysis.yearly_projection?.length > 0 && (
              <div className="h-56 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analysis.yearly_projection}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      label={{
                        value: "Year",
                        position: "insideBottom",
                        offset: -2,
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      width={70}
                      tickFormatter={(v) => compactFmt(v)}
                    />
                    <RTooltip
                      formatter={(v: number) => fmt(v)}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="nominal"
                      name="Nominal savings"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="real"
                      name="Real value (today's money)"
                      stroke="hsl(var(--gold))"
                      strokeWidth={2.5}
                      strokeDasharray="5 4"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-medium">
              Run your first analysis to see your inflation gap
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              We'll pull live inflation data for your country and project your real
              purchasing power.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analysis && (
        <>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/15 p-2 shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-sm mb-1">
                    AI Smart Recommendation
                  </h4>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {analysis.smart_recommendation}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ActionCard
              icon={<ShieldCheck className="h-4 w-4" />}
              title="What to Prepare For"
              body={analysis.what_to_prepare_for}
              tone="green"
            />
            <ActionCard
              icon={<Lightbulb className="h-4 w-4" />}
              title="Adjust Your Plan"
              body={analysis.adjust_your_plan}
              tone="gold"
            />
            <ActionCard
              icon={<Bell className="h-4 w-4" />}
              title="New Developments"
              body={analysis.new_developments_alert}
              tone="blue"
            />
          </div>

          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={runAnalysis}
              disabled={analyzing}
              className="gap-1.5 text-xs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${analyzing ? "animate-spin" : ""}`}
              />
              Refresh inflation data
            </Button>
          </div>
        </>
      )}
        </TabsContent>

        <TabsContent value="budget" className="mt-5">
          <BudgetEstimator ideas={ideas} savingsPlan={savingsPlan} profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const SliderField = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  hint,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  hint?: string;
  format: (n: number) => string;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label className="text-xs">{label}</Label>
      <span className="text-sm font-semibold text-primary">
        {format(value)}
      </span>
    </div>
    <Slider
      value={[value]}
      onValueChange={(v) => onChange(v[0])}
      min={min}
      max={max}
      step={step}
    />
    {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
  </div>
);

const Stat = ({
  label,
  value,
  sub,
  accent,
  warning,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  warning?: boolean;
}) => (
  <div
    className={`rounded-lg p-3 border ${
      warning
        ? "bg-destructive/5 border-destructive/30"
        : accent
        ? "bg-gold/10 border-gold/40"
        : "bg-muted/40 border-border"
    }`}
  >
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
      {label}
    </p>
    <p
      className={`text-base md:text-lg font-heading font-bold mt-1 ${
        warning ? "text-destructive" : accent ? "text-gold" : "text-foreground"
      }`}
    >
      {value}
    </p>
    <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
  </div>
);

const ActionCard = ({
  icon,
  title,
  body,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: "green" | "gold" | "blue";
}) => {
  const toneClasses = {
    green: "bg-primary/10 text-primary border-primary/30",
    gold: "bg-gold/10 text-gold border-gold/40",
    blue: "bg-blue-light/10 text-blue-light border-blue-light/30",
  }[tone];

  return (
    <Card className="h-full">
      <CardContent className="pt-4 space-y-2">
        <div
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium ${toneClasses}`}
        >
          {icon}
          {title}
        </div>
        <p className="text-xs leading-relaxed text-foreground/85">{body}</p>
      </CardContent>
    </Card>
  );
};

export default PlanProtectTab;
