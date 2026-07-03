-- ============ Alter profiles ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS income_structure TEXT DEFAULT 'formal' CHECK (income_structure IN ('formal', 'informal'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ajo_savings NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS retirement_income_target NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS inflation_scenario TEXT DEFAULT 'moderate' CHECK (inflation_scenario IN ('conservative', 'moderate', 'pessimistic'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'premium'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ;

-- ============ Update Hash Function ============
CREATE OR REPLACE FUNCTION public.compute_score_inputs_hash()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
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
    coalesce(NEW.ajo_savings::text, '') || '|' ||
    coalesce(NEW.retirement_income_target::text, '') || '|' ||
    coalesce(NEW.inflation_scenario, '')
  );
  RETURN NEW;
END;
$$;

-- Trigger profiles_score_hash is already set, we just trigger a recalculation
UPDATE public.profiles SET updated_at = now();

-- ============ milestones table ============
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  linked_idea_id UUID REFERENCES public.business_ideas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own milestones" ON public.milestones
  FOR ALL TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON public.milestones TO authenticated, service_role;
