import { describe, expect, it } from "vitest";
import { AI_USAGE_LIMITS } from "../../supabase/functions/_shared/ai-usage-limits";

describe("AI usage ceilings", () => {
  it("keeps each paid AI feature's configured daily and monthly cap", () => {
    expect(AI_USAGE_LIMITS).toEqual({
      "ai-coach": { daily: 100, monthly: 2000 },
      "generate-report": { daily: 10, monthly: 60 },
      "parse-pension-document": { daily: 10, monthly: 50 },
      "budget-analysis": { daily: 30, monthly: 300 },
      "inflation-analysis": { daily: 30, monthly: 300 },
      "idea-viability": { daily: 40, monthly: 300 },
    });
  });
});
