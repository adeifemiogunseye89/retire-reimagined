ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'NG',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en-NG',
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS monthly_expenses numeric,
  ADD COLUMN IF NOT EXISTS dependents integer;