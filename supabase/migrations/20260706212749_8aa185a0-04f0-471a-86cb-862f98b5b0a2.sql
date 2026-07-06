ALTER TABLE public.metric_logs DROP CONSTRAINT IF EXISTS metric_logs_metric_type_check;
ALTER TABLE public.metric_logs ADD CONSTRAINT metric_logs_metric_type_check
  CHECK (metric_type IN ('side_income','business_launched','anxiety_checkin','students_enrolled','savings_contribution','milestone'));