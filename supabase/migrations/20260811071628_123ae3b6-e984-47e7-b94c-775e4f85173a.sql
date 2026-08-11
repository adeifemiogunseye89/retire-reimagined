ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pension_balance_verified numeric,
  ADD COLUMN IF NOT EXISTS pension_last_contribution date,
  ADD COLUMN IF NOT EXISTS pension_fund_administrator text;