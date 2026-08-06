ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_inflation_scenario_check;

UPDATE public.profiles
SET inflation_scenario = 'moderate'
WHERE inflation_scenario IS NULL
   OR inflation_scenario NOT IN ('conservative', 'moderate', 'pessimistic');

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_inflation_scenario_check
  CHECK (inflation_scenario IN ('conservative', 'moderate', 'pessimistic'));