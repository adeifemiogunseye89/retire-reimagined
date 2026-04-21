-- Make sure realtime sends the full row on updates
ALTER TABLE public.savings_plans REPLICA IDENTITY FULL;

-- Add to realtime publication (ignore if already there)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.savings_plans;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;