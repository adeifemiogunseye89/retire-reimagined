// Curated income-reinvention ideas suited to informal / semi-formal earners.
// Kept intentionally small, opinionated, and country-aware.

export interface InformalIdea {
  title: string;
  description: string;
  estMonthlyIncomeUsd: [number, number]; // rough band, USD
  startupCostUsd: [number, number];
  timeToFirstIncomeDays: number;
  bestFor: string[]; // country codes, empty = universal
  tags: string[];
}

export const INFORMAL_IDEA_LIBRARY: InformalIdea[] = [
  {
    title: "Neighbourhood food kitchen (weekday lunch)",
    description: "Cook a small daily menu for nearby offices and workers. Pre-orders via WhatsApp, delivery by okada/rider.",
    estMonthlyIncomeUsd: [150, 600],
    startupCostUsd: [50, 200],
    timeToFirstIncomeDays: 7,
    bestFor: ["NG", "GH", "KE", "ZA"],
    tags: ["food", "local", "low-capital"],
  },
  {
    title: "Cooperative-backed poultry unit",
    description: "50–100 layer birds through a co-op / ajo group. Eggs sold weekly to neighbours and small shops.",
    estMonthlyIncomeUsd: [120, 500],
    startupCostUsd: [300, 900],
    timeToFirstIncomeDays: 90,
    bestFor: ["NG", "GH", "KE"],
    tags: ["agri", "co-op", "recurring"],
  },
  {
    title: "Ajo / susu digital collector",
    description: "Run a small savings circle for your street/market using a spreadsheet + mobile money. Take a small % fee.",
    estMonthlyIncomeUsd: [80, 300],
    startupCostUsd: [0, 30],
    timeToFirstIncomeDays: 14,
    bestFor: ["NG", "GH", "KE"],
    tags: ["fintech-lite", "trust", "no-capital"],
  },
  {
    title: "After-school tutoring (WAEC / KCSE / matric)",
    description: "Small group tutoring in your strongest subject. 6–10 students, 2 evenings per week.",
    estMonthlyIncomeUsd: [100, 400],
    startupCostUsd: [0, 50],
    timeToFirstIncomeDays: 14,
    bestFor: ["NG", "GH", "KE", "ZA"],
    tags: ["skills", "recurring", "no-capital"],
  },
  {
    title: "Mobile phone repair & accessories kiosk",
    description: "Screens, batteries, cases. Start with a small stall near a busy junction or market.",
    estMonthlyIncomeUsd: [200, 700],
    startupCostUsd: [250, 800],
    timeToFirstIncomeDays: 21,
    bestFor: ["NG", "GH", "KE", "ZA"],
    tags: ["retail", "technical"],
  },
  {
    title: "Social-media manager for local SMEs",
    description: "Manage Instagram/TikTok/WhatsApp catalogues for 3–5 nearby businesses on retainer.",
    estMonthlyIncomeUsd: [150, 600],
    startupCostUsd: [0, 30],
    timeToFirstIncomeDays: 14,
    bestFor: [],
    tags: ["digital", "recurring", "no-capital"],
  },
  {
    title: "Solar phone-charging & wifi hub",
    description: "Small solar setup providing paid charging and hotspot access in an off-grid or unreliable-grid area.",
    estMonthlyIncomeUsd: [120, 400],
    startupCostUsd: [300, 700],
    timeToFirstIncomeDays: 30,
    bestFor: ["NG", "GH", "KE"],
    tags: ["energy", "recurring"],
  },
  {
    title: "Fresh produce reseller (farm → neighbourhood)",
    description: "Buy in bulk weekly from farm gate, resell to a WhatsApp customer list. Fixed delivery day.",
    estMonthlyIncomeUsd: [100, 400],
    startupCostUsd: [80, 250],
    timeToFirstIncomeDays: 10,
    bestFor: ["NG", "GH", "KE", "ZA"],
    tags: ["agri", "trading"],
  },
  {
    title: "Airbnb / short-let co-hosting",
    description: "Manage 1–3 short-let apartments for owners (cleaning, guest chat, pricing) for a % of revenue.",
    estMonthlyIncomeUsd: [200, 900],
    startupCostUsd: [0, 100],
    timeToFirstIncomeDays: 21,
    bestFor: [],
    tags: ["service", "recurring"],
  },
  {
    title: "Compliance / civil-service consulting on retainer",
    description: "Use your formal-sector expertise to advise SMEs on tax filings, procurement, or grant applications.",
    estMonthlyIncomeUsd: [300, 1200],
    startupCostUsd: [0, 50],
    timeToFirstIncomeDays: 30,
    bestFor: [],
    tags: ["expertise", "high-margin"],
  },
];

export function ideasForCountry(country?: string | null): InformalIdea[] {
  const c = (country || "").toUpperCase();
  return INFORMAL_IDEA_LIBRARY.filter(i => i.bestFor.length === 0 || i.bestFor.includes(c));
}
