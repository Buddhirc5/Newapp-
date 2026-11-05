-- Security hardening.
-- 1. Admin rights need a session that passed the authenticator step (aal2).
-- 2. effective_plan only answers for yourself (or admins).
-- 3. Settings are range-checked, and every admin change is written to an audit log.
-- 4. AI uses are reserved atomically, so parallel requests can't pass the daily limit.
-- 5. Per-member hourly limits on posting, messaging, reporting and booking.
-- 6. PayHere notifications are logged; documents accept WebP.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Admins must have passed MFA in this session.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
    and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2';
$$;

-- For the admin sign-in screen only: is this account on the admin list at all?
-- It grants nothing; it just tells the UI to ask for the authenticator code.
create or replace function public.is_admin_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke all on function public.is_admin_account() from public, anon;
grant execute on function public.is_admin_account() to authenticated;

-- Admins can see who else is an admin (also clears the "RLS without policy" notice).
create policy "Admins see the admin list"
  on public.admins for select to authenticated
  using ((select public.is_admin()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. A member's plan is private.
-- ─────────────────────────────────────────────────────────────────────────────

-- Internal: any member's plan. Not callable through the API.
create or replace function public.plan_of(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p.plan in ('pro', 'ultra') and (p.plan_ends_at is null or p.plan_ends_at + interval '3 days' > now()) then p.plan
    when p.plan = 'trial' and p.trial_ends_at > now() then 'trial'
    else 'free'
  end
  from public.profiles p
  where p.id = p_user;
$$;

revoke execute on function public.plan_of(uuid) from public, anon, authenticated;

-- API: your own plan, or anyone's for an admin.
create or replace function public.effective_plan(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_user = (select auth.uid()) or (select public.is_admin()) then public.plan_of(p_user) end;
$$;

create or replace function public.my_ai_quota()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  plan text := public.plan_of(me);
  lim integer;
begin
  if me is null then
    raise exception 'Sign in first';
  end if;
  lim := case plan
    when 'ultra' then coalesce((select (value #>> '{}')::int from public.app_settings where key = 'ai_daily_limit_ultra'), 60)
    when 'pro' then coalesce((select (value #>> '{}')::int from public.app_settings where key = 'ai_daily_limit_pro'), 15)
    when 'trial' then coalesce((select (value #>> '{}')::int from public.app_settings where key = 'ai_daily_limit_trial'), 5)
    else 0
  end;
  return jsonb_build_object(
    'plan', plan,
    'limit', lim,
    'used', (select count(*) from public.ai_usage where user_id = me and kind <> 'batch' and created_at > now() - interval '1 day'),
    'enabled', coalesce((select value = 'true'::jsonb from public.app_settings where key = 'ai_enabled'), false)
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Admin audit log and setting bounds.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.admin_audit (
  id bigint generated always as identity primary key,
  actor uuid default auth.uid(),
  action text not null,
  target_table text not null,
  target_id text,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_created_idx on public.admin_audit (created_at desc);

alter table public.admin_audit enable row level security;

create policy "Admins read the audit log"
  on public.admin_audit for select to authenticated
  using ((select public.is_admin()));
-- No insert/update/delete policies: rows are written only by the trigger below.

-- Records what an admin changed. Members' own edits aren't logged.
-- (Inside SECURITY DEFINER functions current_user is the owner, so the caller
-- is identified from the request JWT instead.)
create or replace function public.log_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  diff jsonb := '{}'::jsonb;
  k text;
  before jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  after jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
begin
  -- Only changes made by a signed-in admin (with MFA) are logged; system jobs aren't.
  if not public.is_admin() then
    return coalesce(new, old);
  end if;
  for k in select jsonb_object_keys(before || after) loop
    if k not in ('updated_at') and (before -> k) is distinct from (after -> k) then
      diff := diff || jsonb_build_object(k, jsonb_build_object('from', before -> k, 'to', after -> k));
    end if;
  end loop;
  insert into public.admin_audit (action, target_table, target_id, changes)
  values (lower(tg_op), tg_table_name, coalesce(after ->> 'id', before ->> 'id', after ->> 'key', before ->> 'key'), diff);
  return coalesce(new, old);
end;
$$;

revoke execute on function public.log_admin_change() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'app_settings', 'listings', 'agencies', 'provider_applications', 'gigs', 'gig_orders', 'news_items', 'reports', 'payments', 'groups']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_admin_audit', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.log_admin_change()', t || '_admin_audit', t);
  end loop;
end;
$$;

-- Keeps prices, limits and fees inside sensible ranges, so a typo can't charge
-- members Rs 199,000 or turn off every limit.
create or replace function public.check_setting_bounds()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  n numeric;
begin
  if new.key in ('main_price_lkr', 'ultra_price_lkr', 'pro_price_lkr', 'ai_daily_limit', 'ai_daily_limit_trial', 'ai_daily_limit_pro', 'ai_daily_limit_ultra', 'platform_fee_percent', 'trial_days') then
    begin
      n := (new.value #>> '{}')::numeric;
    exception when others then
      raise exception 'Setting % must be a number', new.key;
    end;
    if new.key in ('main_price_lkr', 'ultra_price_lkr', 'pro_price_lkr') and (n < 300 or n > 50000) then
      raise exception 'Package prices must be between Rs 300 and Rs 50,000';
    elsif new.key like 'ai_daily_limit%' and (n < 0 or n > 500) then
      raise exception 'Daily AI limits must be between 0 and 500';
    elsif new.key = 'platform_fee_percent' and (n < 0 or n > 50) then
      raise exception 'The platform fee must be between 0 and 50 percent';
    elsif new.key = 'trial_days' and (n < 0 or n > 90) then
      raise exception 'The free trial must be between 0 and 90 days';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists app_settings_bounds on public.app_settings;
create trigger app_settings_bounds before insert or update on public.app_settings
  for each row execute function public.check_setting_bounds();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Reserve an AI use before calling the model (refunded if the call fails).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.ai_usage add column if not exists status text not null default 'done' check (status in ('reserved', 'done'));

create or replace function public.reserve_ai_use(p_user uuid, p_kind text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  plan text := public.plan_of(p_user);
  lim integer;
  used integer;
  rid bigint;
begin
  -- One reservation at a time per member, so parallel requests queue here.
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 42));
  lim := case plan
    when 'ultra' then coalesce((select (value #>> '{}')::int from public.app_settings where key = 'ai_daily_limit_ultra'), 60)
    when 'pro' then coalesce((select (value #>> '{}')::int from public.app_settings where key = 'ai_daily_limit_pro'), 15)
    when 'trial' then coalesce((select (value #>> '{}')::int from public.app_settings where key = 'ai_daily_limit_trial'), 5)
    else 0
  end;
  select count(*) into used from public.ai_usage where user_id = p_user and kind <> 'batch' and created_at > now() - interval '1 day';
  if used >= lim then
    return null;
  end if;
  insert into public.ai_usage (user_id, kind, status) values (p_user, p_kind, 'reserved') returning id into rid;
  return rid;
end;
$$;

-- Only Edge Functions (service role) reserve uses.
revoke execute on function public.reserve_ai_use(uuid, text) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Hourly limits per member.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.enforce_hourly_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author_col text := tg_argv[0];
  max_per_hour integer := tg_argv[1]::int;
  author uuid := (to_jsonb(new) ->> author_col)::uuid;
  n integer;
begin
  -- System jobs (no signed-in member) and admins aren't limited.
  if (select auth.uid()) is null or public.is_admin() or author is null then
    return new;
  end if;
  execute format('select count(*) from public.%I where %I = $1 and created_at > now() - interval ''1 hour''', tg_table_name, author_col)
    into n using author;
  if n >= max_per_hour then
    raise exception 'You''re doing that a lot. Please wait a while and try again.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_hourly_limit() from public, anon, authenticated;

drop trigger if exists listings_rate on public.listings;
create trigger listings_rate before insert on public.listings for each row execute function public.enforce_hourly_limit('owner_id', '10');
drop trigger if exists messages_rate on public.messages;
create trigger messages_rate before insert on public.messages for each row execute function public.enforce_hourly_limit('sender_id', '120');
drop trigger if exists group_messages_rate on public.group_messages;
create trigger group_messages_rate before insert on public.group_messages for each row execute function public.enforce_hourly_limit('sender_id', '60');
drop trigger if exists reports_rate on public.reports;
create trigger reports_rate before insert on public.reports for each row execute function public.enforce_hourly_limit('reporter_id', '20');
drop trigger if exists gig_orders_rate on public.gig_orders;
create trigger gig_orders_rate before insert on public.gig_orders for each row execute function public.enforce_hourly_limit('buyer_id', '10');
drop trigger if exists meetups_rate on public.meetups;
create trigger meetups_rate before insert on public.meetups for each row execute function public.enforce_hourly_limit('host_id', '5');
drop trigger if exists agencies_rate on public.agencies;
create trigger agencies_rate before insert on public.agencies for each row execute function public.enforce_hourly_limit('submitted_by', '5');

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Payment notification log and document types.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  provider text not null,
  order_ref text,
  status_code text,
  accepted boolean not null,
  reason text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.payment_events enable row level security;

create policy "Admins read payment events"
  on public.payment_events for select to authenticated
  using ((select public.is_admin()));

update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
where id = 'documents';

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Move pg_net out of the public schema (its functions stay in schema "net",
--    so the scheduled jobs keep working).
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if exists (select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pg_net' and n.nspname = 'public') then
    create schema if not exists extensions;
    drop extension pg_net;
    create extension pg_net with schema extensions;
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Account deletion: a provider's past bookings stay (unlinked from the
--    deleted session) instead of blocking the deletion.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.gig_orders alter column gig_id drop not null;
alter table public.gig_orders drop constraint if exists gig_orders_gig_id_fkey;
alter table public.gig_orders add constraint gig_orders_gig_id_fkey foreign key (gig_id) references public.gigs (id) on delete set null;
