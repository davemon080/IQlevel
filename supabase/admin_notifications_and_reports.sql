create extension if not exists pgcrypto;

create or replace function public.is_connect_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users
    where uid = auth.uid()
      and role = 'admin'
  );
$$;

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.users(uid) on delete cascade,
  target_uid uuid references public.users(uid) on delete cascade,
  title text not null,
  body text not null,
  link text,
  delivery_mode text not null default 'notification' check (delivery_mode in ('notification', 'popup', 'both')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_target_uid_idx on public.admin_notifications(target_uid);
create index if not exists admin_notifications_created_at_idx on public.admin_notifications(created_at desc);

alter table public.admin_notifications enable row level security;

drop policy if exists "Users can read admin notifications" on public.admin_notifications;
create policy "Users can read admin notifications"
on public.admin_notifications
for select
to authenticated
using (
  is_active = true
  and (target_uid is null or target_uid = auth.uid() or public.is_connect_admin())
);

drop policy if exists "Admins manage admin notifications" on public.admin_notifications;
create policy "Admins manage admin notifications"
on public.admin_notifications
for all
to authenticated
using (public.is_connect_admin())
with check (public.is_connect_admin());

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_uid uuid not null references public.users(uid) on delete cascade,
  reported_uid uuid not null references public.users(uid) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'resolved', 'dismissed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_reports_not_self check (reporter_uid <> reported_uid)
);

create index if not exists user_reports_reporter_uid_idx on public.user_reports(reporter_uid);
create index if not exists user_reports_reported_uid_idx on public.user_reports(reported_uid);
create index if not exists user_reports_status_idx on public.user_reports(status);

create or replace function public.touch_user_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_reports_updated_at on public.user_reports;
create trigger trg_user_reports_updated_at
before update on public.user_reports
for each row
execute function public.touch_user_reports_updated_at();

alter table public.user_reports enable row level security;

drop policy if exists "Users can create reports" on public.user_reports;
create policy "Users can create reports"
on public.user_reports
for insert
to authenticated
with check (reporter_uid = auth.uid());

drop policy if exists "Users can read own reports and admins read all reports" on public.user_reports;
create policy "Users can read own reports and admins read all reports"
on public.user_reports
for select
to authenticated
using (reporter_uid = auth.uid() or public.is_connect_admin());

drop policy if exists "Admins update reports" on public.user_reports;
create policy "Admins update reports"
on public.user_reports
for update
to authenticated
using (public.is_connect_admin())
with check (public.is_connect_admin());
