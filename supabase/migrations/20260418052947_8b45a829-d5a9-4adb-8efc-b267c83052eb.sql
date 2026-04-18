CREATE TABLE public.project_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_name TEXT NOT NULL,
  description TEXT,
  timeline_months INTEGER NOT NULL DEFAULT 12,
  linked_idea_id UUID,
  cost_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_analysis JSONB,
  last_inflation_rate NUMERIC,
  last_analysis_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project budgets"
  ON public.project_budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project budgets"
  ON public.project_budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project budgets"
  ON public.project_budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own project budgets"
  ON public.project_budgets FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_project_budgets_updated_at
  BEFORE UPDATE ON public.project_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.project_budgets;