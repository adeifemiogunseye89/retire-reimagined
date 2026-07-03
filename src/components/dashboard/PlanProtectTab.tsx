import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  ComposedChart,
  Line,
  Area,
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
import { getScenarioInflation } from "@/pages/Assessment";

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
  alternative_hedges?: string[];
};

const PlanProtectTab = ({
  profile,
  report,
  ideas,
  savingsPlan,
  savingsPlanUpdatedAt,
  onPlanSaved,
}: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const isInformal = profile?.incomeStructure === "informal";
  const scenario = profile?.inflationScenario || "moderate";

  const fmt = (n: number) =>
    formatMoney(n, profile?.currency, profile?.language);
  const country = getCountry(profile?.country);

  // Scenario-adjusted inflation range display
  const activeInflation = getScenarioInflation(country.inflation, scenario);
  const inflationRangeMin = (activeInflation * 0.9).toFixed(0);
  const inflationRangeMax = (activeInflation * 1.1).toFixed(0);

  const monthlyRange = currencyRange(country.currency, 0, 500000, 1000);
  const emergencyRange = currencyRange(country.currency, 0, 5000000, 10000);
  const incomeRange = currencyRange(country.currency, 0, 1000000, 5000);

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

  // For informal users: savings target is a percentage (e.g. 15% of salary)
  // We initialize percentage by dividing target by salary, or defaulting to 15%
  const initialSavingsVal = savingsPlan?.monthlySavingsTarget ?? 25000;
  const salaryVal = profile?.currentSalary || 200000;
  const initialSavingsPercent = Math.max(5, Math.min(50, Math.round((initialSavingsVal / salaryVal) * 100))) || 15;

  const [savingsPercent, setSavingsPercent] = useState(initialSavingsPercent);
  const [monthlySavings, setMonthlySavings] = useState(initialSavingsVal);

  const [emergencyGoal, setEmergencyGoal] = useState(
    savingsPlan?.emergencyFundGoal ?? 500000
  );
  const [retirementIncome, setRetirementIncome] = useState(
    savingsPlan?.desiredRetirementIncome ?? (profile?.retirementIncomeTarget || 250000)
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

  // Sync state when props change
  useEffect(() => {
    if (savingsPlan) {
      setMonthlySavings(savingsPlan.monthlySavingsTarget);
      setEmergencyGoal(savingsPlan.emergencyFundGoal);
      setRetirementIncome(savingsPlan.desiredRetirementIncome);
      setBusinessProjection(savingsPlan.businessIncomeProjection);
      setCurrentSavings(savingsPlan.currentSavings);
      setYearsHorizon(savingsPlan.yearsHorizon);
      const newPercent = Math.round((savingsPlan.monthlySavingsTarget / salaryVal) * 100);
      setSavingsPercent(Math.max(5, Math.min(50, newPercent)));
    }
  }, [savingsPlan, salaryVal]);

  // Sync with realtime updates
  useEffect(() => {
    if (savingsPlan?.aiRecommendations) {
      setAnalysis(savingsPlan.aiRecommendations as Analysis);
      setLastChecked(savingsPlan.lastInflationCheck);
    }
  }, [savingsPlan?.aiRecommendations, savingsPlan?.lastInflationCheck]);

  const useReportData = () => {
    if (report) {
      setRetirementIncome(
        Math.max(retirementIncome, (profile?.currentSalary || 0) * 0.7)
      );
    }
    if (profile?.currentSalary) {
      const target = Math.round(profile.currentSalary * 0.15);
      setMonthlySavings(target);
      setSavingsPercent(15);
      setEmergencyGoal(profile.currentSalary * 6);
    }
    setBusinessProjection(businessTotal);
    toast({ title: "Loaded from your AI report ✨" });
  };

  const savePlan = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    const targetSavingsAmt = isInformal 
      ? Math.round((profile?.currentSalary || 0) * (savingsPercent / 100))
      : monthlySavings;

    const payload = {
      user_id: user.id,
      monthly_savings_target: targetSavingsAmt,
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
    isInformal,
    profile?.currentSalary,
    savingsPercent,
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
    const targetSavingsAmt = isInformal 
      ? Math.round((profile?.currentSalary || 0) * (savingsPercent / 100))
      : monthlySavings;

    try {
      // Save first
      await supabase.from("savings_plans").upsert(
        {
          user_id: user.id,
          monthly_savings_target: targetSavingsAmt,
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
            monthly_savings_target: targetSavingsAmt,
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
            inflation_hint: activeInflation,
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

  const handleUpdateScenario = async (newScenario: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ inflation_scenario: newScenario } as any)
      .eq("user_id", user.id);
    if (!error) {
      toast({ title: `Assumption updated to ${newScenario} 🚀` });
      onPlanSaved();
    }
  };

  // Inflation data freshness check (60 days)
  const isStale = lastChecked
    ? Date.now() - new Date(lastChecked).getTime() > 60 * 24 * 60 * 60 * 1000
    : true;

  const lastCheckedLabel = lastChecked
    ? new Date(lastChecked).toLocaleString(profile?.language || "en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Never — run an analysis";

  // Chart data: overlay Target Income line
  const targetSavingsAmt = isInformal 
    ? (profile?.currentSalary || 0) * (savingsPercent / 100)
    : monthlySavings;
  const targetIncomeAnnual = retirementIncome * 12;

  const chartData = analysis?.yearly_projection?.map((item) => {
    return {
      ...item,
      target: targetIncomeAnnual,
    };
  }) || [];

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-heading font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("dashboard.plan.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.plan.subtitle")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="overview" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("dashboard.plan.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="budget" className="gap-1.5">
            <Calculator className="h-3.5 w-3.5" />
            {t("dashboard.plan.tabs.budget")}
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
                {isInformal ? (
                  <SliderField
                    label="Monthly savings target (% of average income)"
                    value={savingsPercent}
                    onChange={setSavingsPercent}
                    min={5}
                    max={50}
                    step={1}
                    format={(v) => `${v}% (~${fmt(Math.round((profile?.currentSalary || 0) * (v / 100)))})`}
                  />
                ) : (
                  <SliderField
                    label="Monthly savings target"
                    value={monthlySavings}
                    onChange={setMonthlySavings}
                    min={monthlyRange.min}
                    max={monthlyRange.max}
                    step={monthlyRange.step}
                    format={fmt}
                  />
                )}
                <SliderField
                  label={isInformal ? "Emergency fund target (months of expenses)" : "Emergency fund goal"}
                  value={isInformal ? Math.round(emergencyGoal / (profile?.monthlyExpenses || 50000)) : emergencyGoal}
                  onChange={(v) => setEmergencyGoal(isInformal ? v * (profile?.monthlyExpenses || 50000) : v)}
                  min={isInformal ? 3 : emergencyRange.min}
                  max={isInformal ? 24 : emergencyRange.max}
                  step={isInformal ? 1 : emergencyRange.step}
                  format={(v) => isInformal ? `${v} months (~${fmt(v * (profile?.monthlyExpenses || 50000))})` : fmt(v)}
                />
                <SliderField
                  label={isInformal ? "Desired monthly retirement target" : "Desired post-retirement monthly income"}
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
                  {analysis ? "Re-analyze plan" : "Analyze plan"}
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
                  <div className="flex items-center gap-2">
                    {/* Scenario adjustment toggle inline */}
                    <div className="bg-primary-foreground/10 p-0.5 rounded-lg border border-primary-foreground/20 flex text-[10px]">
                      {["conservative", "moderate", "pessimistic"].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleUpdateScenario(s)}
                          className={`px-2 py-1 rounded-md capitalize transition-all ${
                            scenario === s
                              ? "bg-primary-foreground text-primary font-semibold"
                              : "text-primary-foreground/75 hover:text-primary-foreground"
                          }`}
                        >
                          {s.slice(0, 4)}
                        </button>
                      ))}
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-primary-foreground/20 text-primary-foreground border-0"
                    >
                      {inflationRangeMin}%–{inflationRangeMax}% range
                    </Badge>
                  </div>
                </div>
                <p className="text-sm opacity-90 leading-relaxed">
                  {analysis.headline_message}
                </p>
                <p className="text-[11px] opacity-70 mt-2">
                  {analysis.inflation_source_note} • Updated {lastCheckedLabel}
                  {isStale && (
                    <span className="ms-2 text-destructive-foreground bg-destructive/30 px-1.5 py-0.5 rounded-full font-bold">
                      Data stale (&gt;60 days)
                    </span>
                  )}
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
                    label={isInformal ? "Retirement Gap" : "Monthly Gap"}
                    value={fmt(analysis.inflation_gap_naira)}
                    sub={`${analysis.inflation_gap_percent.toFixed(0)}% short`}
                    warning
                  />
                </div>

                {chartData.length > 0 && (
                  <div className="h-64 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData}>
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
                        <Area
                          type="monotone"
                          dataKey="real"
                          fill="hsl(var(--destructive) / 0.15)"
                          stroke="transparent"
                          name="Gap Shading"
                          legendType="none"
                        />
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
                          name="Real value"
                          stroke="hsl(var(--gold))"
                          strokeWidth={2.5}
                          strokeDasharray="5 4"
                          dot={{ r: 3 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="target"
                          name="Retirement Income Target (Annual)"
                          stroke="hsl(var(--destructive))"
                          strokeWidth={2}
                          strokeDasharray="3 3"
                          dot={false}
                        />
                      </ComposedChart>
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
                  We'll evaluate your plan against scenario-adjusted inflation CPI ranges.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Alternative Asset Suggestions */}
          {analysis && analysis.alternative_hedges && (
            <Card className="border-primary/20 bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-heading flex items-center gap-2 text-primary">
                  <Lightbulb className="h-4 w-4" />
                  Recommended Local Inflation Hedges ({country.name})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {analysis.alternative_hedges.map((hedge, idx) => (
                    <div key={idx} className="p-3 bg-card rounded-lg border text-xs leading-relaxed">
                      <p className="font-semibold text-primary mb-1">Option #{idx + 1}</p>
                      <p className="text-muted-foreground">{hedge}</p>
                    </div>
                  ))}
                </div>
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
