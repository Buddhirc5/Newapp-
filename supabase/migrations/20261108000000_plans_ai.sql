-- Paid packages (Main and Ultra), per-plan AI limits, AI assist usage,
-- nightly journey reviews (Message Batches) and PayHere checkout records.

-- ─────────────────────────────────────────────────────────────────────────────
-- Plans: trial (first month), free, pro (Main), ultra.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check check (plan in ('trial', 'free', 'pro', 'ultra'));
alter table public.profiles add column if not exists plan_ends_at timestamptz;

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.verified = old.verified;
    new.plan = old.plan;
    new.plan_ends_at = old.plan_ends_at;
    new.trial_ends_at = old.trial_ends_at;
    if new.role = 'provider' and old.role <> 'provider' then
      new.role = old.role;
    end if;
  end if;
  return new;
end;
$$;

-- Which plan a member is effectively on right now. A paid plan past its end
-- date (plus a 3-day grace period for renewals) counts as free.
create or replace function public.effective_plan(p_user uuid)
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

revoke execute on function public.effective_plan(uuid) from public, anon;
grant execute on function public.effective_plan(uuid) to authenticated;

insert into public.app_settings (key, value, description) values
  ('main_price_lkr', '1990', 'Main package monthly price in rupees'),
  ('ultra_price_lkr', '5990', 'Ultra package monthly price in rupees'),
  ('ai_daily_limit_trial', '5', 'AI uses per day during the free month'),
  ('ai_daily_limit_pro', '15', 'AI uses per day on the Main package'),
  ('ai_daily_limit_ultra', '60', 'AI uses per day on the Ultra package'),
  ('ai_batch_enabled', 'true', 'Run the nightly AI journey review for paying members'),
  ('payments_enabled', 'false', 'Show online checkout once the PayHere merchant keys are set')
on conflict (key) do nothing;

update public.app_settings set value = '1990', description = 'Main package monthly price in rupees (kept for older clients)' where key = 'pro_price_lkr';

-- AI usage now covers every AI feature, not just document checks.
alter table public.ai_usage add column if not exists model text;
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check check (kind in ('document', 'cv', 'sop', 'journey', 'batch'));

-- Today's usage and limit for the signed-in member.
create or replace function public.my_ai_quota()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  plan text := public.effective_plan(me);
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

revoke execute on function public.my_ai_quota() from public, anon;
grant execute on function public.my_ai_quota() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Nightly journey reviews. Written only by the journey-batch Edge Function.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.ai_batches (
  id text primary key,
  kind text not null default 'journey',
  status text not null default 'in_progress' check (status in ('in_progress', 'ended', 'failed')),
  request_count integer not null default 0,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.ai_batches enable row level security;

create policy "Admins see AI batches"
  on public.ai_batches for select to authenticated
  using ((select public.is_admin()));

create table if not exists public.journey_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null default 'batch' check (source in ('batch', 'on_demand')),
  insight jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists journey_insights_user_idx on public.journey_insights (user_id, created_at desc);

alter table public.journey_insights enable row level security;

create policy "Members see their journey insights"
  on public.journey_insights for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Members delete their journey insights"
  on public.journey_insights for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Payments: link a checkout to the plan it buys.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.payments add column if not exists plan text check (plan is null or plan in ('pro', 'ultra'));
create unique index if not exists payments_provider_ref_idx on public.payments (provider, provider_ref) where provider_ref is not null;

-- Admin overview: count both paid packages.
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  return jsonb_build_object(
    'members', (select count(*) from public.profiles),
    'new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'in_nz', (select count(*) from public.profiles where situation = 'in_nz'),
    'in_lk', (select count(*) from public.profiles where situation = 'in_lk'),
    'on_trial', (select count(*) from public.profiles where plan = 'trial' and trial_ends_at > now()),
    'pro', (select count(*) from public.profiles where plan = 'pro'),
    'ultra', (select count(*) from public.profiles where plan = 'ultra'),
    'listings', (select count(*) from public.listings where status = 'active'),
    'hidden', (select count(*) from public.listings where status = 'hidden'),
    'open_reports', (select count(*) from public.reports where not resolved),
    'pending_agencies', (select count(*) from public.agencies where status = 'pending'),
    'pending_providers', (select count(*) from public.provider_applications where status = 'pending'),
    'gigs', (select count(*) from public.gigs where active),
    'bookings_30d', (select count(*) from public.gig_orders where created_at > now() - interval '30 days'),
    'ai_checks_7d', (select count(*) from public.ai_usage where created_at > now() - interval '7 days'),
    'messages_7d', (select count(*) from public.group_messages where created_at > now() - interval '7 days'),
    'revenue_30d_lkr', (select coalesce(sum(amount), 0) from public.payments where status = 'paid' and currency = 'LKR' and created_at > now() - interval '30 days'),
    'stages', (select coalesce(jsonb_object_agg(stage, n), '{}'::jsonb) from (select stage, count(*) n from public.profiles group by stage) s)
  );
end;
$$;

revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
