
create table public.metric_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  metric_type text not null check (metric_type in ('side_income','business_launched','anxiety_checkin','students_enrolled')),
  value numeric not null,
  note text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index metric_logs_user_time_idx on public.metric_logs(user_id, logged_at desc);
alter table public.metric_logs enable row level security;
create policy "Users can view own metric logs" on public.metric_logs for select using (auth.uid() = user_id);
create policy "Users can insert own metric logs" on public.metric_logs for insert with check (auth.uid() = user_id);
create policy "Users can delete own metric logs" on public.metric_logs for delete using (auth.uid() = user_id);
