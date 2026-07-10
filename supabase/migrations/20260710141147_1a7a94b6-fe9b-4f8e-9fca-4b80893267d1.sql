
-- retirement_goals
CREATE TABLE public.retirement_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 200 AND char_length(title) > 0),
  target_amount NUMERIC,
  target_date DATE,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'savings' CHECK (category IN ('savings','property','investment','emergency_fund','business','other')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retirement_goals TO authenticated;
GRANT ALL ON public.retirement_goals TO service_role;
ALTER TABLE public.retirement_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own retirement goals"
  ON public.retirement_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_retirement_goals_user ON public.retirement_goals(user_id, created_at DESC);
CREATE TRIGGER trg_retirement_goals_updated
  BEFORE UPDATE ON public.retirement_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- email_log
CREATE TABLE public.email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('day7_reengagement','monthly_savings_nudge','report_stale')),
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_log TO authenticated;
GRANT ALL ON public.email_log TO service_role;
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own email log"
  ON public.email_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX idx_email_log_user_sent ON public.email_log(user_id, sent_at DESC);
