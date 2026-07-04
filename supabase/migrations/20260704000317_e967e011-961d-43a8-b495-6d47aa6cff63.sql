
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS income_structure text NOT NULL DEFAULT 'formal',
  ADD COLUMN IF NOT EXISTS primary_activity text,
  ADD COLUMN IF NOT EXISTS has_pension boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ajo_savings numeric,
  ADD COLUMN IF NOT EXISTS retirement_income_target numeric,
  ADD COLUMN IF NOT EXISTS inflation_scenario text NOT NULL DEFAULT 'moderate';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_income_structure_check
  CHECK (income_structure IN ('formal','informal','mixed'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_inflation_scenario_check
  CHECK (inflation_scenario IN ('low','moderate','high'));

-- Update hash trigger to include employment fork so a switch regenerates the report.
CREATE OR REPLACE FUNCTION public.compute_score_inputs_hash()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.score_inputs_hash := md5(
    coalesce(NEW.age::text, '') || '|' ||
    coalesce(NEW.years_in_service::text, '') || '|' ||
    coalesce(NEW.grade_level, '') || '|' ||
    coalesce(NEW.sector, '') || '|' ||
    coalesce(NEW.current_salary::text, '') || '|' ||
    coalesce(NEW.pension_projection::text, '') || '|' ||
    coalesce(NEW.monthly_expenses::text, '') || '|' ||
    coalesce(NEW.dependents::text, '') || '|' ||
    coalesce(NEW.country, '') || '|' ||
    coalesce(NEW.currency, '') || '|' ||
    coalesce(NEW.region, '') || '|' ||
    coalesce(NEW.income_structure, '') || '|' ||
    coalesce(NEW.primary_activity, '') || '|' ||
    coalesce(NEW.has_pension::text, '') || '|' ||
    coalesce(NEW.ajo_savings::text, '') || '|' ||
    coalesce(NEW.retirement_income_target::text, '')
  );
  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists (idempotent).
DROP TRIGGER IF EXISTS trg_compute_score_inputs_hash ON public.profiles;
CREATE TRIGGER trg_compute_score_inputs_hash
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.compute_score_inputs_hash();
