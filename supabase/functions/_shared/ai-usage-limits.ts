/** Hard UTC-calendar caps shared by all paid AI functions. */
export const AI_USAGE_LIMITS = {
  "ai-coach": { daily: 100, monthly: 2000 },
  "generate-report": { daily: 10, monthly: 60 },
  "parse-pension-document": { daily: 10, monthly: 50 },
  "budget-analysis": { daily: 30, monthly: 300 },
  "inflation-analysis": { daily: 30, monthly: 300 },
  "idea-viability": { daily: 40, monthly: 300 },
} as const;

export type QuotaFunction = keyof typeof AI_USAGE_LIMITS;