-- Event-level user activity log backing the /admin/activity page.
-- Stores plain user UUIDs (no FK to auth.users), one row per tracked action.
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null,
  entity text,
  detail text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_log_created_at on public.activity_log (created_at desc);
create index idx_activity_log_user_time on public.activity_log (user_id, created_at desc);
create index idx_activity_log_action_time on public.activity_log (action, created_at desc);

grant insert, select on public.activity_log to authenticated;
grant all on public.activity_log to service_role;

alter table public.activity_log enable row level security;

create policy "Users can insert their own activity events"
  on public.activity_log for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Admins can read all activity events"
  on public.activity_log for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Admin-only reader: joins emails from auth.users and names from profiles.
create or replace function public.admin_activity_log(
  _days integer default 7,
  _search text default null,
  _limit integer default 100,
  _offset integer default 0
)
returns table (
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  action text,
  entity text,
  detail text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.user_id,
    au.email,
    p.full_name,
    a.action,
    a.entity,
    a.detail,
    a.created_at
  from public.activity_log a
  left join auth.users au on au.id = a.user_id
  left join public.profiles p on p.user_id = a.user_id
  where a.created_at >= now() - make_interval(days => greatest(coalesce(_days, 7), 1))
    and (
      _search is null or btrim(_search) = '' or
      coalesce(au.email, '') ilike '%' || btrim(_search) || '%' or
      coalesce(p.full_name, '') ilike '%' || btrim(_search) || '%' or
      a.action ilike '%' || btrim(_search) || '%' or
      coalesce(a.entity, '') ilike '%' || btrim(_search) || '%'
    )
  order by a.created_at desc
  limit least(greatest(coalesce(_limit, 100), 1), 500)
  offset greatest(coalesce(_offset, 0), 0)
$$;

grant execute on function public.admin_activity_log(integer, text, integer, integer) to authenticated;
grant execute on function public.admin_activity_log(integer, text, integer, integer) to service_role;