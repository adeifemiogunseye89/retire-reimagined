import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Save,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import GoalsSection from "./GoalsSection";
import { estimateReadiness } from "@/lib/readiness";
import { formatMoney, getCountry, currencyRange } from "@/lib/regions";
import type {
  ProfileData,
  ReportData,
  BusinessIdea,
  SavingsPlanData,
} from "@/hooks/useDashboardData";

interface Props {
  profile: ProfileData | null;
  report: ReportData | null;
  ideas: BusinessIdea[];
  savingsPlan: SavingsPlanData | null;
  onPlanSaved: () => void;
}

/** Minimal goal shape used only for live scoring. */
interface GoalRow {
  target_amount: number | null;
  current_amount: number | null;
}

/**
 * Plan editor — edit the retirement plan, goals and milestones.
 * The readiness preview recalculates instantly on every input change;
 * "Save & update my score" persists the plan and regenerates the official
 * AI report so the dashboard score refreshes live (via realtime insert).
 */
const PlanEditor = ({ profile, report, ideas, savingsPlan, onPlanSaved }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const isInformal = profile?.incomeStructure === "informal";
  const country = getCountry(profile?.country);
  const fmt = (n: number) => formatMoney(n, profile?.currency, profile?.language);

  const monthlyRange = currencyRange(country.currency, 0, 500000, 1000);
  const emergencyRange = currencyRange(country.currency, 0, 5000000, 10000);
  const incomeRange = currencyRange(country.currency, 0, 1000000, 5000);

  const businessTotal = ideas.reduce((sum, i) => sum + (i.projectedIncome || 0), 0);
  const salaryVal = profile?.currentSalary || 0;

  const initialSavingsVal = savingsPlan?.monthlySavingsTarget ?? 25000;
  const initialPercent =
    salaryVal > 0
      ? Math.max(5, Math.min(50, Math.round((initialSavingsVal / salaryVal) * 100))) || 15
      : 15;

  const [savingsPercent, setSavingsPercent] = useState(initialPercent);
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
  const [currentSavings, setCurrentSavings] = useState(savingsPlan?.currentSavings ?? 0);
  const [yearsHorizon, setYearsHorizon] = useState(savingsPlan?.yearsHorizon ?? 5);

  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Goals for live scoring (edits flow back through onGoalsChanged).
  const [goals, setGoals] = useState<GoalRow[]>([]);

  useEffect(() => {
    if (savingsPlan) {
      setMonthlySavings(savingsPlan.monthlySavingsTarget);
      setEmergencyGoal(savingsPlan.emergencyFundGoal);
      setRetirementIncome(savingsPlan.desiredRetirementIncome);
      setBusinessProjection(savingsPlan.businessIncomeProjection);
      setCurrentSavings(savingsPlan.currentSavings);
      setYearsHorizon(savingsPlan.yearsHorizon);
      if (salaryVal > 0) {
        const pct = Math.round((savingsPlan.monthlySavingsTarget / salaryVal) * 100);
        setSavingsPercent(Math.max(5, Math.min(50, pct)));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savingsPlan]);

  const loadGoals = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("retirement_goals")
      .select("target_amount,current_amount")
      .eq("user_id", user.id)
      // Scale guard: bounded page size.
      .limit(100);
    if (data) setGoals(data as GoalRow[]);
  }, [user]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const goalsProgress = useMemo(() => {
    const withTarget = goals.filter(
      (g) => Number(g.target_amount) > 0
    ) as (GoalRow & { target_amount: number })[];
    if (withTarget.length === 0) return 0;
    const sum = withTarget.reduce(
      (acc, g) =>
        acc + Math.min(1, Math.max(0, Number(g.current_amount) / Number(g.target_amount))),
      0
    );
    return sum / withTarget.length;
  }, [goals]);

  const effectiveMonthlySavings = isInformal
    ? Math.round((salaryVal * savingsPercent) / 100)
    : monthlySavings;

  // Live preview — recomputes instantly on every input change.
  const estimate = useMemo(
    () =>
      estimateReadiness({
        monthlySavings: effectiveMonthlySavings + (profile?.ajoSavings || 0),
        emergencyFundGoal: emergencyGoal,
        desiredRetirementIncome: retirementIncome,
        businessIncomeProjection: businessProjection,
        currentSavings,
        yearsHorizon,
        pensionProjection: profile?.pensionProjection || 0,
        monthlyExpenses: profile?.monthlyExpenses || 0,
        currentSalary: salaryVal,
        fallbackTarget: profile?.retirementIncomeTarget || 0,
        goalsProgress,
      }),
    [
      effectiveMonthlySavings,
      profile?.ajoSavings,
      emergencyGoal,
      retirementIncome,
      businessProjection,
      currentSavings,
      yearsHorizon,
      profile?.pensionProjection,
      profile?.monthlyExpenses,
      profile?.retirementIncomeTarget,
      salaryVal,
      goalsProgress,
    ]
  );

  const officialScore = report?.readinessScore || 0;
  const delta = estimate.score - officialScore;

  const buildPlanPayload = () => ({
    user_id: user!.id,
    monthly_savings_target: effectiveMonthlySavings,
    emergency_fund_goal: emergencyGoal,
    desired_retirement_income: retirementIncome,
    business_income_projection: businessProjection,
    current_savings: currentSavings,
    years_horizon: yearsHorizon,
  });

  const savePlan = async (alsoRegenerate: boolean) => {
    if (!user) return;
    if (alsoRegenerate) setRegenerating(true);
    else setSaving(true);

    try {
      const { error: upsertError } = await supabase
        .from("savings_plans")
        .upsert(buildPlanPayload(), { onConflict: "user_id" });
      if (upsertError) throw upsertError;

      if (alsoRegenerate) {
        // Persist the plan, then regenerate the official AI report.
        // `regeneratePlan` skips re-seeding business ideas (no duplicates).
        const { error: fnError } = await supabase.functions.invoke("generate-report", {
          body: {
            regeneratePlan: true,
            planData: {
              monthlySavingsTarget: effectiveMonthlySavings,
              emergencyFundGoal: emergencyGoal,
              desiredRetirementIncome: retirementIncome,
              businessIncomeProjection: businessProjection,
              currentSavings,
              yearsHorizon,
            },
            profileData: {
              fullName: profile?.fullName,
              age: profile?.age,
              yearsInService: profile?.yearsInService,
              gradeLevel: profile?.gradeLevel,
              sector: profile?.sector,
              currentSalary: profile?.currentSalary,
              pensionProjection: profile?.pensionProjection,
              monthlyExpenses: profile?.monthlyExpenses,
              dependents: profile?.dependents,
              country: country.name,
              currency: country.currency,
              language: profile?.language,
              region: profile?.region,
              incomeStructure: profile?.incomeStructure,
              ajoSavings: profile?.ajoSavings,
              retirementIncomeTarget: profile?.retirementIncomeTarget,
              inflation: country.inflation,
            },
          },
        });
        if (fnError) throw fnError;
        toast({
          title: "Score updated ✨",
          description: "Your dashboard readiness score now reflects these inputs.",
        });
      } else {
        toast({ title: "Plan saved 💚" });
      }
      onPlanSaved();
    } catch (e) {
      toast({
        title: alsoRegenerate ? "Could not update score" : "Could not save plan",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setRegenerating(false);
    }
  };

  const deltaChip = () => {
    if (officialScore === 0) return null;
    if (delta > 0)
      return (
        <Badge className="gap-1 border-0 bg-secondary/15 text-secondary">
          <TrendingUp className="h-3 w-3" /> +{delta} vs your score
        </Badge>
      );
    if (delta < 0)
      return (
        <Badge className="gap-1 border-0 bg-destructive/10 text-destructive">
          <TrendingDown className="h-3 w-3" /> {delta} vs your score
        </Badge>
      );
    return (
      <Badge className="gap-1 border-0 bg-muted text-muted-foreground">
        <Minus className="h-3 w-3" /> matches your score
      </Badge>
    );
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Live readiness preview */}
      <Card className="border-accent/30 shadow-warm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Gauge className="h-4 w-4 text-accent" />
            Live readiness preview
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Updates instantly as you change any input below. Save to refresh your
            official AI score on the dashboard.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-heading font-bold tabular-nums text-primary">
                {estimate.score}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            {deltaChip()}
            <div className="text-xs text-muted-foreground">
              Official score: <span className="font-semibold">{officialScore || "—"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {estimate.breakdown.map((item) => (
              <div key={item.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {item.points}/{item.max} pts
                  </span>
                </div>
                <Progress
                  value={(item.points / item.max) * 100}
                  className="h-1.5"
                />
                <p className="text-[10px] text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t text-xs">
            <div>
              <p className="text-muted-foreground">Projected monthly income</p>
              <p className="font-semibold tabular-nums">
                {fmt(Math.round(estimate.projectedMonthlyIncome))}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Monthly target</p>
              <p className="font-semibold tabular-nums">
                {estimate.target > 0 ? fmt(Math.round(estimate.target)) : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Projected fund in {yearsHorizon} yrs</p>
              <p className="font-semibold tabular-nums">
                {fmt(Math.round(estimate.projectedFund))}
              </p>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            How this preview works: contributions grow at 8% a year, your fund pays
            4% a year (the safe-withdrawal rule), and that income is added to your
            pension and business projections. The official score uses the same
            inputs plus your country context, regenerated by AI when you save.
          </p>
        </CardContent>
      </Card>

      {/* Plan inputs */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading">Retirement plan inputs</CardTitle>
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
                format={(v) =>
                  `${v}% (~${fmt(Math.round((salaryVal || 0) * (v / 100)))})`
                }
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
              label={
                isInformal
                  ? "Emergency fund target (months of expenses)"
                  : "Emergency fund goal"
              }
              value={
                isInformal
                  ? Math.round(emergencyGoal / (profile?.monthlyExpenses || 50000))
                  : emergencyGoal
              }
              onChange={(v) =>
                setEmergencyGoal(
                  isInformal ? v * (profile?.monthlyExpenses || 50000) : v
                )
              }
              min={isInformal ? 3 : emergencyRange.min}
              max={isInformal ? 24 : emergencyRange.max}
              step={isInformal ? 1 : emergencyRange.step}
              format={(v) =>
                isInformal
                  ? `${v} months (~${fmt(v * (profile?.monthlyExpenses || 50000))})`
                  : fmt(v)
              }
            />
            <SliderField
              label={
                isInformal
                  ? "Desired monthly retirement target"
                  : "Desired post-retirement monthly income"
              }
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
              <Label htmlFor="editor-savings" className="text-xs">
                Current savings ({country.currency})
              </Label>
              <Input
                id="editor-savings"
                type="number"
                value={currentSavings}
                onChange={(e) => setCurrentSavings(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editor-years" className="text-xs">
                Planning horizon (years)
              </Label>
              <Input
                id="editor-years"
                type="number"
                min={1}
                max={30}
                value={yearsHorizon}
                onChange={(e) =>
                  setYearsHorizon(
                    Math.min(30, Math.max(1, Number(e.target.value) || 1))
                  )
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => savePlan(false)}
              disabled={saving || regenerating}
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
              onClick={() => savePlan(true)}
              disabled={saving || regenerating}
              className="gap-1.5 gradient-hero text-primary-foreground"
            >
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Save & update my score
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Goals & milestones editing */}
      <div className="space-y-2">
        <h3 className="text-sm font-heading font-semibold text-muted-foreground">
          Goals & milestones
        </h3>
        <p className="text-xs text-muted-foreground">
          Goal completion feeds your readiness preview and score.
        </p>
      </div>
      <GoalsSection profile={profile} onGoalsChanged={loadGoals} />
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
      <span className="text-sm font-semibold text-primary">{format(value)}</span>
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

export default PlanEditor;
