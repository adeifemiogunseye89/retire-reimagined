/**
 * Central place for the plain-language assumptions behind every projection the
 * app shows. Keeping them here means the dashboard, the report view and the PDF
 * all describe the numbers the same way — no black-box figures.
 *
 * This module is presentation-only: it reads the profile the user already filled
 * in and describes it. It performs no projection maths of its own and changes no
 * business logic.
 */
import { getCountry } from "@/lib/regions";
import type { ProfileData } from "@/hooks/useDashboardData";

export interface Assumption {
  /** Short label, e.g. "Inflation assumed" */
  label: string;
  /** The value we actually used, already formatted for reading */
  value: string;
  /** One sentence, non-technical: what it means / where it came from */
  explain: string;
}

/** Inflation rate implied by the chosen scenario, relative to the country base. */
export function scenarioInflation(profile: ProfileData | null): number {
  const base = getCountry(profile?.country).inflation;
  switch (profile?.inflationScenario) {
    case "conservative":
      return Math.max(1, Math.round(base * 0.75));
    case "pessimistic":
      return Math.round(base * 1.25);
    default:
      return base;
  }
}

const SCENARIO_WORDS: Record<string, string> = {
  conservative: "a calmer outlook than today's official figure",
  moderate: "today's official figure for your country",
  pessimistic: "a stress test using higher-than-today inflation",
};

/**
 * Builds the human-readable assumption list used by the "How this is calculated"
 * panels and by the PDF report summary.
 */
export function buildAssumptions(profile: ProfileData | null): Assumption[] {
  const country = getCountry(profile?.country);
  const scenario = profile?.inflationScenario || "moderate";
  const inflation = scenarioInflation(profile);
  const age = profile?.age || 0;
  const retirementAge = 60;
  const yearsLeft = age > 0 ? Math.max(0, retirementAge - age) : null;

  const money = (n: number) => {
    try {
      return new Intl.NumberFormat(profile?.language || country.locale, {
        style: "currency",
        currency: profile?.currency || country.currency,
        maximumFractionDigits: 0,
      }).format(Math.round(n));
    } catch {
      return `${profile?.currency || country.currency} ${Math.round(n).toLocaleString()}`;
    }
  };

  const list: Assumption[] = [
    {
      label: "Country & currency",
      value: `${country.flag} ${country.name} · ${profile?.currency || country.currency}`,
      explain: `Every figure is shown in your local money, and we use the ${country.pensionNote} as the retirement system behind your projection.`,
    },
    {
      label: "Inflation assumed",
      value: `${inflation}% a year (${scenario})`,
      explain: `We chose ${SCENARIO_WORDS[scenario] || SCENARIO_WORDS.moderate}. You can switch this any time — the shortfall figure moves with it.`,
    },
    {
      label: "Retirement age used",
      value: yearsLeft === null ? `${retirementAge}` : `${retirementAge} (about ${yearsLeft} years away)`,
      explain: "We plan to the standard retirement age unless you tell us otherwise, so the years of saving left are counted from your current age.",
    },
    {
      label: "Safe monthly income from savings",
      value: "4% of your savings per year",
      explain: "A widely used rule of thumb: drawing about 4% of your pot each year is generally considered sustainable, so your pot is turned into monthly income that way.",
    },
    {
      label: "Monthly money you'll need",
      value: profile?.monthlyExpenses ? money(profile.monthlyExpenses) : "based on your current pay",
      explain: profile?.monthlyExpenses
        ? "This is the monthly spending you entered, adjusted for the inflation above."
        : "You haven't entered your monthly spending yet, so we estimate what you'll need from your current pay. Adding it makes your numbers sharper.",
    },
  ];

  if (profile?.retirementIncomeTarget) {
    list.push({
      label: "Your income target",
      value: `${money(profile.retirementIncomeTarget)} a month`,
      explain: "The monthly retirement income you told us you want. Your shortfall is simply this target minus what your savings and side income are on track to produce.",
    });
  }

  if (profile?.dependents) {
    list.push({
      label: "People depending on you",
      value: `${profile.dependents}`,
      explain: "Dependants raise the monthly amount you're likely to need, so they nudge your readiness score down slightly.",
    });
  }

  list.push({
    label: "What we do not assume",
    value: "no windfalls, no market timing",
    explain: "We never assume an inheritance, a lucky investment or a promotion. Projections are estimates, not promises — real returns will vary year to year.",
  });

  return list;
}
