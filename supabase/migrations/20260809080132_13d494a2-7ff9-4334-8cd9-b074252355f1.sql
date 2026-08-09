CREATE TABLE public.goal_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.retirement_goals(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_date date,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_milestones_goal_id ON public.goal_milestones(goal_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_milestones TO authenticated;
GRANT ALL ON public.goal_milestones TO service_role;

ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestones for their own goals"
ON public.goal_milestones FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.retirement_goals g WHERE g.id = goal_milestones.goal_id AND g.user_id = auth.uid()));

CREATE POLICY "Users can create milestones for their own goals"
ON public.goal_milestones FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.retirement_goals g WHERE g.id = goal_milestones.goal_id AND g.user_id = auth.uid()));

CREATE POLICY "Users can update milestones for their own goals"
ON public.goal_milestones FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.retirement_goals g WHERE g.id = goal_milestones.goal_id AND g.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.retirement_goals g WHERE g.id = goal_milestones.goal_id AND g.user_id = auth.uid()));

CREATE POLICY "Users can delete milestones for their own goals"
ON public.goal_milestones FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.retirement_goals g WHERE g.id = goal_milestones.goal_id AND g.user_id = auth.uid()));