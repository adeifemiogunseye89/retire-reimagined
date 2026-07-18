ALTER TABLE public.business_ideas
  ADD COLUMN IF NOT EXISTS viability_score integer,
  ADD COLUMN IF NOT EXISTS viability_notes jsonb,
  ADD COLUMN IF NOT EXISTS viability_checked_at timestamptz;