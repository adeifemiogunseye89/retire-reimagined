/**
 * Deterministic client-side readiness estimate.
 *
 * The official readiness score comes from the `generate-report` AI function and
 * is expensive to run. This estimator mirrors its logic (income coverage vs the
 * retirement target, emergency cushion, savings rate, goal progress) so the
 * plan editor can show an instant, live preview while the user drags sliders.
 * It is presentation-only — it never writes to the database.
 */

export interface ReadinessBreakdownItem {
  key: string;
  label: string;
  points: number;
  max: number;
  /** Primary ratio driving this item (0-1) for display, e.g. coverage %. */
  rate: number;
  /** Human-readable unit for the rate: "%" or "months". */
  rateUnit: string;
  detail: string;
}

export interface ReadinessEstimate {
  score: number;
  breakdown: ReadinessBreakdownItem[];
  projectedMonthlyIncome: number;
  target: number;
  projectedFund: number;
}

export interface ReadinessInput {
  monthlySavings: number;
  emergencyFundGoal: number;
  desiredRetirementIncome: number;
  businessIncomeProjection: number;
  currentSavings: number;
  yearsHorizon: number;
  pensionProjection: number;
  monthlyExpenses: number;
  currentSalary: number;
  /** Profile-level retirement income target used when the plan has none. */
  fallbackTarget: number;
  /** 0-1 average completion across goals that have a target amount. */
  goalsProgress: number;
}

const ANNUAL_RETURN = 0.08; // expected annual return assumption
const SWR = 0.04; // 4% safe withdrawal rate

export function estimateReadiness(input: ReadinessInput): ReadinessEstimate {
  const years = Math.max(1, Math.min(40, Math.round(input.yearsHorizon) || 5));
  const months = years * 12;
  const monthlyRate = ANNUAL_RETURN / 12;

  // Future value of monthly contributions + current savings grown to date.
  const fvContributions =
    monthlyRate === 0
      ? input.monthlySavings * months
      : input.monthlySavings * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  const fvCurrent = input.currentSavings * Math.pow(1 + ANNUAL_RETURN, years);
  const projectedFund = fvContributions + fvCurrent;
  const monthlyFromFund = (projectedFund * SWR) / 12;

  const projectedMonthlyIncome =
    input.pensionProjection + input.businessIncomeProjection + monthlyFromFund;

  const target =
    input.desiredRetirementIncome > 0
      ? input.desiredRetirementIncome
      : input.fallbackTarget > 0
        ? input.fallbackTarget
        : input.currentSalary > 0
          ? input.currentSalary * 0.7
          : 0;
  const coverage = target > 0 ? Math.max(0, projectedMonthlyIncome / target) : 0;

  // 1. Income coverage vs the retirement target — the hero factor.
  const incomePoints = Math.round(55 * Math.min(1, coverage));

  // 2. Emergency cushion (6 months of expenses is fully covered).
  const expenseBase =
    input.monthlyExpenses > 0 ? input.monthlyExpenses : input.currentSalary * 0.6;
  const emergencyMonths = expenseBase > 0 ? input.emergencyFundGoal / expenseBase : 0;
  const emergencyPoints = Math.round(15 * Math.min(1, emergencyMonths / 6));

  // 3. Savings rate — 15%+ of income earns full credit.
  const savingsBase =
    input.currentSalary > 0
      ? input.currentSalary
      : input.monthlyExpenses > 0
        ? input.monthlyExpenses * 1.5
        : 0;
  const savingsRate = savingsBase > 0 ? input.monthlySavings / savingsBase : 0;
  const savingsPoints = Math.round(20 * Math.min(1, savingsRate / 0.15));

  // 4. Goal progress — average completion across goals with a target amount.
  const goalsPoints = Math.round(10 * Math.min(1, Math.max(0, input.goalsProgress)));

  const raw = incomePoints + emergencyPoints + savingsPoints + goalsPoints;
  const score = Math.max(1, Math.min(100, Math.round(raw)));

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  const breakdown: ReadinessBreakdownItem[] = [
    {
      key: "income",
      label: "Retirement income coverage",
      points: incomePoints,
      max: 55,
      rate: coverage,
      rateUnit: "%",
      detail: `Pension, business income and savings (4% rule) vs your ${target > 0 ? "monthly target" : "implied target"}`,
    },
    {
      key: "emergency",
      label: "Emergency cushion",
      points: emergencyPoints,
      max: 15,
      rate: emergencyMonths,
      rateUnit: "months",
      detail: "Months of expenses your emergency fund covers (6 is fully covered)",
    },
    {
      key: "savings",
      label: "Savings rate",
      points: savingsPoints,
      max: 20,
      rate: savingsRate,
      rateUnit: "%",
      detail: pct(savingsRate) + " of income saved monthly (15%+ earns full credit)",
    },
    {
      key: "goals",
      label: "Goal progress",
      points: goalsPoints,
      max: 10,
      rate: Math.min(1, Math.max(0, input.goalsProgress)),
      rateUnit: "%",
      detail: "Average completion across your goals with a target amount",
    },
  ];

  return { score, breakdown, projectedMonthlyIncome, target, projectedFund };
}
