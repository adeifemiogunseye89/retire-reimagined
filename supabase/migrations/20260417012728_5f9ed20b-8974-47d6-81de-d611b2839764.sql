-- Create savings_plans table
CREATE TABLE public.savings_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  monthly_savings_target NUMERIC DEFAULT 0,
  emergency_fund_goal NUMERIC DEFAULT 0,
  desired_retirement_income NUMERIC DEFAULT 0,
  business_income_projection NUMERIC DEFAULT 0,
  current_savings NUMERIC DEFAULT 0,
  years_horizon INTEGER DEFAULT 5,
  last_inflation_rate NUMERIC,
  last_inflation_check TIMESTAMP WITH TIME ZONE,
  ai_recommendations JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.savings_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own savings plan" ON public.savings_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own savings plan" ON public.savings_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings plan" ON public.savings_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings plan" ON public.savings_plans
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_savings_plans_updated_at
  BEFORE UPDATE ON public.savings_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.savings_plans REPLICA IDENTITY FULL;
ALTER TABLE public.business_ideas REPLICA IDENTITY FULL;
ALTER TABLE public.user_metrics REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.savings_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_ideas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_metrics;