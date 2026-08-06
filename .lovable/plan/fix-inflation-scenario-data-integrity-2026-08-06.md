# Fix inflation_scenario data integrity

## Verified current state

- `profiles.inflation_scenario` is `text NOT NULL DEFAULT 'moderate'`.
- The `'low' | 'moderate' | 'high'` CHECK constraint added in an earlier migration was **already dropped** by a later migration, so the column currently has **no CHECK constraint** at all.
- All 4 existing profile rows hold `'moderate'`, so no data repair is actually needed — the backfill statement will be a no-op safety net.
- The assessment submit block does **not** write `inflation_scenario` (confirmed) — every new profile silently takes the DB default.
- The dashboard UI (`HomeTab`, `PlanProtectTab`) already writes only `'conservative' | 'moderate' | 'pessimistic'`. The only remaining shorthand references are tolerant comparisons in two edge functions plus a comment/helper in `Assessment.tsx`.

## What will change

### 1. Standardise on full words
- `src/pages/Assessment.tsx` — `getScenarioInflation()`: drop the `'low'` / `'high'` aliases and the comment mentioning the shorthand set; keep the multiplier behaviour (conservative 0.6x, moderate 1x, pessimistic 1.4x).
- `supabase/functions/ai-coach/index.ts` and `supabase/functions/inflation-analysis/index.ts` — remove the `|| scenario === "low"` / `|| scenario === "high"` fallbacks. Both functions get redeployed.
- Task priorities (`low`/`medium`/`high` in `TasksPanel`) are unrelated and stay untouched.

### 2. New assessment step
Insert a step titled "Inflation outlook" between "Career & Finances" and "Skills & Interests", with the radio group:

- "Optimistic — inflation stays manageable" → `conservative`
- "Moderate — gradual cost of living rise" → `moderate`
- "Pessimistic — significant inflation pressure" → `pessimistic`

Styled with the same bordered radio cards already used by the "How you earn today" step. `formData` gains `inflationScenario: "moderate"`.

### 3. Persist the value
Add `inflation_scenario: formData.inflationScenario` to the profile update in `handleSubmit`. The value also flows into the `generate-report` payload via the existing `...formData` spread.

### 4. Migration
One migration that:
1. Drops `profiles_inflation_scenario_check` if present (defensive — none exists now).
2. Normalises any NULL/invalid rows to `'moderate'`.
3. Re-adds the constraint allowing only `'conservative'`, `'moderate'`, `'pessimistic'`.

Order matters: the backfill runs before the constraint is added so it cannot fail on legacy rows.

## Out of scope
- No changes to `income_structure`.
- No UI/routing changes beyond the added assessment step.
