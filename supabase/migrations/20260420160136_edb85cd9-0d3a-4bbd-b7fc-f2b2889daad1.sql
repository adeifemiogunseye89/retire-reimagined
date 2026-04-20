-- Worksheets table for AI-generated educational worksheets
CREATE TABLE public.worksheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  grade_level TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  question_count INTEGER NOT NULL DEFAULT 10,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answer_key JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.worksheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own worksheets"
  ON public.worksheets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own worksheets"
  ON public.worksheets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own worksheets"
  ON public.worksheets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own worksheets"
  ON public.worksheets FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_worksheets_updated_at
  BEFORE UPDATE ON public.worksheets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_worksheets_user_id ON public.worksheets(user_id, created_at DESC);