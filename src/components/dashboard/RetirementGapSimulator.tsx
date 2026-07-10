import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Calculator, TrendingUp } from "lucide-react";
import type { ProfileData } from "@/hooks/useDashboardData";

interface Props {
  profile: ProfileData | null;
}

/**
 * Interactive retirement calculator — live sliders, no submit.
 * Uses future-value formulas on monthly savings + expected annual return,
 * then applies the 4% Safe Withdrawal Rate to get sustainable monthly income.
 */
const RetirementGapSimulator = ({ profile }: Props) => {
  const currency = profile?.currency || "USD";
  const locale = profile?.language || "en-US";
  const isInformal = profile?.incomeStructure === "informal";
  const currentAge = profile?.age || 40;
  const target = profile?.retirementIncomeTarget || 0;

  const [monthlySavings, setMonthlySavings] = useState(25_000);
  const [retirementAge, setRetirementAge] = useState(Math.max(60, currentAge + 1));
  const [annualReturn, setAnnualReturn] = useState(8); // percent
  const [sideIncome, setSideIncome] = useState(0);

  const fmt = (n: number) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(Math.round(n));
    } catch {
      return `${currency} ${Math.round(n).toLocaleString()}`;
    }
  };

  const years = Math.max(0, retirementAge - currentAge);
  const months = years * 12;
  const monthlyRate = annualReturn / 100 / 12;

  // Future value of a series of monthly contributions
  const projectedFund = useMemo(() => {
    if (months === 0) return 0;
    if (monthlyRate === 0) return monthlySavings * months;
    return monthlySavings * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  }, [monthlySavings, monthlyRate, months]);

  // 4% Safe Withdrawal Rate — annual, then divided by 12
  const monthlyFromFund = (projectedFund * 0.04) / 12;
  const monthlyIncome = monthlyFromFund + sideIncome;
  const gap = Math.max(0, target - monthlyIncome);
  const surplus = monthlyIncome - target;

  // Additional monthly savings needed to close the remaining gap
  // Solve monthlySavings for FV = extraNeeded * 12 / 0.04
  const extraSavingsNeeded = useMemo(() => {
    if (target === 0 || gap === 0 || months === 0) return 0;
    const fundNeeded = (gap * 12) / 0.04;
    if (monthlyRate === 0) return fundNeeded / months;
    return fundNeeded / ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  }, [gap, target, months, monthlyRate]);

  const gapClosed = target > 0 && gap === 0;
  const noTarget = target === 0;

  return (
    <Card className="border-accent/30 shadow-warm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Calculator className="h-4 w-4 text-accent" />
          Retirement gap simulator
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Move the sliders to see how savings, timing, and returns reshape your retirement income.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SimSlider
            label={isInformal ? "Average monthly savings" : "Current monthly savings"}
            value={monthlySavings}
            min={0}
            max={500_000}
            step={1_000}
            display={fmt(monthlySavings)}
            onChange={setMonthlySavings}
          />
          <SimSlider
            label="Retirement age"
            value={retirementAge}
            min={45}
            max={75}
            step={1}
            display={`${retirementAge} yrs (${years} to go)`}
            onChange={setRetirementAge}
          />
          <SimSlider
            label="Expected annual return"
            value={annualReturn}
            min={1}
            max={25}
            step={0.5}
            display={`${annualReturn.toFixed(1)}%`}
            onChange={setAnnualReturn}
          />
          <SimSlider
            label="Monthly side income target"
            value={sideIncome}
            min={0}
            max={500_000}
            step={1_000}
            display={fmt(sideIncome)}
            onChange={setSideIncome}
          />
        </div>

        {/* Live outputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
          <OutputStat
            label={`Projected fund at ${retirementAge}`}
            value={fmt(projectedFund)}
            tone="primary"
          />
          <OutputStat
            label="Monthly income (4% rule + side income)"
            value={fmt(monthlyIncome)}
            tone="secondary"
          />
          <OutputStat
            label="Gap vs. target"
            value={
              noTarget
                ? "—"
                : gapClosed
                  ? `+${fmt(surplus)} surplus`
                  : fmt(gap)
            }
            tone={noTarget ? "muted" : gapClosed ? "success" : "danger"}
          />
        </div>

        <div className="text-sm">
          {noTarget ? (
            <p className="text-muted-foreground">
              Set your retirement income target in your profile to unlock the gap comparison.
            </p>
          ) : gapClosed ? (
            <p className="text-secondary font-medium flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" /> Your gap is closing — keep going.
            </p>
          ) : (
            <p className="text-destructive font-medium">
              You need an additional {fmt(extraSavingsNeeded)} per month to close this gap.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface SimSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}

const SimSlider = ({ label, value, min, max, step, display, onChange }: SimSliderProps) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-xs font-semibold tabular-nums">{display}</span>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onChange(v[0])}
    />
  </div>
);

const toneClasses: Record<string, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  success: "text-secondary",
  danger: "text-destructive",
  muted: "text-muted-foreground",
};

const OutputStat = ({ label, value, tone }: { label: string; value: string; tone: string }) => (
  <div>
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
    <p className={`text-2xl font-heading font-bold tabular-nums ${toneClasses[tone] || ""}`}>
      {value}
    </p>
  </div>
);

export default RetirementGapSimulator;
