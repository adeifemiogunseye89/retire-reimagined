ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS milestone_25_hit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS milestone_50_hit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS milestone_75_hit boolean NOT NULL DEFAULT false;