-- Sign-in method and sign-up source tracking, one free month per Google
-- account, a free daily AI question after the free month, a daily AI
-- spending cap, AI misuse flags, and chat counted in AI analytics.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Where members came from (first visit), set once by the member at sign-up.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists signup_source text check (signup_source is null or char_length(signup_source) <= 60);
alter table public.profiles add column if not exists signup_campaign text check (signup_campaign is null or char_length(signup_campaign) <= 80);
alter table public.profiles add column if not exists signup_referrer text check (signup_referrer is null or char_length(signup_referrer) <= 120);

create or replace function public.set_signup_source(p_source text, p_campaign text, p_referrer text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.profiles
     set signup_source = left(lower(regexp_replace(coalesce(nullif(trim(p_source), ''), 'direct'), '[^a-zA-Z0-9._-]', '', 'g')), 60),
         signup_campaign = nullif(left(regexp_replace(coalesce(p_campaign, ''), '[^a-zA-Z0-9._ -]', '', 'g'), 80), ''),
         signup_referrer = nullif(left(regexp_replace(coalesce(p_referrer, ''), '[^a-zA-Z0-9.-]', '', 'g'), 120), '')
   where id = auth.uid() and signup_source is null;
end;
$$;
revoke execute on function public.set_signup_source(text, text, text) from public, anon;
grant execute on function public.set_signup_source(text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. One free month per email / Google account, even after deleting the account.
--    Only a one-way hash of the normalised address is kept.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.trial_claims (
  email_hash text primary key,
  claimed_at timestamptz not null default now()
);
alter table public.trial_claims enable row level security;

create or replace function public.normalise_email(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(lower(coalesce(p_email, '')), '@', 2) in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(lower(p_email), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else split_part(split_part(lower(coalesce(p_email, '')), '@', 1), '+', 1) || '@' || split_part(lower(coalesce(p_email, '')), '@', 2)
  end;
$$;

insert into public.trial_claims (email_hash)
select encode(extensions.digest(public.normalise_email(u.email), 'sha256'), 'hex') from auth.users u where u.email is not null
on conflict do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  days integer := coalesce((select (value #>> '{}')::integer from public.app_settings where key = 'trial_days'), 30);
  hash text := case when new.email is null then null else encode(extensions.digest(public.normalise_email(new.email), 'sha256'), 'hex') end;
  claimed integer := 1;
begin
  if hash is not null then
    insert into public.trial_claims (email_hash) values (hash) on conflict do nothing;
    get diagnostics claimed = row_count;
  end if;
  insert into public.profiles (id, display_name, trial_ends_at)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'New member'),
    -- Someone who already had a free month (for example, deleted and signed up again) starts on Free.
    case when claimed > 0 then now() + make_interval(days => days) else now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. AI: 1 free request a day after the free month, and a daily spending cap
--    for the whole app (estimated from each request's kind and model).
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.app_settings (key, value, description) values
  ('ai_daily_limit_free', '1', 'AI requests a day for members after their free month'),
  ('ai_daily_budget_usd', '1', 'Most KiwiPath may spend on AI in one day, in US dollars (estimated)')
on conflict (key) do nothing;

create or replace function public.ai_cost_usd(p_kind text, p_model text)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select (case p_kind when 'document' then 0.015 when 'sop' then 0.01 when 'cv' then 0.005 when 'journey' then 0.005 when 'chat' then 0.004 when 'batch' then 0.001 else 0.005 end)
       * (case when coalesce(p_model, '') like 'claude-sonnet%' then 5 else 1 end);
$$;

create or replace function public.ai_spend_today_usd()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(public.ai_cost_usd(kind, model)), 0) from public.ai_usage where created_at > now() - interval '1 day';
$$;
revoke execute on function public.ai_spend_today_usd() from public, anon, authenticated;

create or replace function public.ai_limit_for(p_plan text)
returns integer
language sql
stable
set search_path = ''
as $$
  select case p_plan
    when 'ultra' then coalesce((select (value #>> '{}')::int from public.app_settings where key = 'ai_daily_limit_ultra'), 60)
    when 'pro' then coalesce((select (value #>> '{}')::int from public.app_settings where key = 'ai_daily_limit_pro'), 15)
    when 'trial' then coalesce((select (value #>> '{}')::int from public.app_settings where key = 'ai_daily_limit_trial'), 5)
    else coalesce((select (value #>> '{}')::int from public.app_settings where key = 'ai_daily_limit_free'), 1)
  end;
$$;

-- Returns the reservation id, null when the member's daily limit is reached,
-- or -1 when KiwiPath's daily AI budget is used up.
create or replace function public.reserve_ai_use(p_user uuid, p_kind text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  lim integer := public.ai_limit_for(public.plan_of(p_user));
  used integer;
  budget numeric := coalesce((select (value #>> '{}')::numeric from public.app_settings where key = 'ai_daily_budget_usd'), 1);
  rid bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 42));
  select count(*) into used from public.ai_usage where user_id = p_user and kind <> 'batch' and created_at > now() - interval '1 day';
  if used >= lim then
    return null;
  end if;
  if public.ai_spend_today_usd() + public.ai_cost_usd(p_kind, null) > budget then
    return -1;
  end if;
  insert into public.ai_usage (user_id, kind, status) values (p_user, p_kind, 'reserved') returning id into rid;
  return rid;
end;
$$;
revoke execute on function public.reserve_ai_use(uuid, text) from public, anon, authenticated;

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
begin
  if me is null then
    raise exception 'Sign in first';
  end if;
  return jsonb_build_object(
    'plan', plan,
    'limit', public.ai_limit_for(plan),
    'used', (select count(*) from public.ai_usage where user_id = me and kind <> 'batch' and created_at > now() - interval '1 day'),
    'enabled', coalesce((select value = 'true'::jsonb from public.app_settings where key = 'ai_enabled'), false)
  );
end;
$$;

create or replace function public.check_setting_bounds()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  n numeric;
begin
  if new.key in ('main_price_lkr', 'ultra_price_lkr', 'pro_price_lkr', 'main_yearly_price_lkr', 'ultra_yearly_price_lkr', 'ai_daily_limit', 'ai_daily_limit_trial', 'ai_daily_limit_pro', 'ai_daily_limit_ultra', 'ai_daily_limit_free', 'ai_daily_budget_usd', 'platform_fee_percent', 'trial_days') then
    begin
      n := (new.value #>> '{}')::numeric;
    exception when others then
      raise exception 'Setting % must be a number', new.key;
    end;
    if new.key in ('main_price_lkr', 'ultra_price_lkr', 'pro_price_lkr') and (n < 300 or n > 50000) then
      raise exception 'Package prices must be between Rs 300 and Rs 50,000';
    elsif new.key in ('main_yearly_price_lkr', 'ultra_yearly_price_lkr') and (n < 3000 or n > 500000) then
      raise exception 'Yearly prices must be between Rs 3,000 and Rs 500,000';
    elsif new.key like 'ai_daily_limit%' and (n < 0 or n > 500) then
      raise exception 'Daily AI limits must be between 0 and 500';
    elsif new.key = 'ai_daily_budget_usd' and (n < 0 or n > 200) then
      raise exception 'The daily AI budget must be between US$0 and US$200';
    elsif new.key = 'platform_fee_percent' and (n < 0 or n > 50) then
      raise exception 'The platform fee must be between 0 and 50 percent';
    elsif new.key = 'trial_days' and (n < 0 or n > 90) then
      raise exception 'The free trial must be between 0 and 90 days';
    end if;
  end if;
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. AI misuse flags (attempts to jailbreak or abuse the assistant).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.ai_flags (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  reason text not null,
  sample text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists ai_flags_user_idx on public.ai_flags (user_id, created_at desc);
alter table public.ai_flags enable row level security;
drop policy if exists "Admins read AI flags" on public.ai_flags;
create policy "Admins read AI flags" on public.ai_flags for select to authenticated using (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Admin: members list shows sign-in method and source.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.admin_members(text, integer);
create function public.admin_members(p_search text default '', p_limit integer default 500)
returns table (
  id uuid, email text, display_name text, situation text, stage text, path text, city text, role text, plan text, effective_plan text,
  plan_ends_at timestamptz, verified boolean, onboarded boolean, trial_ends_at timestamptz, created_at timestamptz, last_sign_in_at timestamptz,
  last_active timestamptz, banned_until timestamptz, ai_30d bigint, listings bigint, bookings bigint, paid_lkr numeric,
  provider text, signup_source text, signup_campaign text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  return query
    select p.id, u.email::text, p.display_name, p.situation, p.stage, p.path, p.city, p.role, p.plan, public.plan_of(p.id),
           p.plan_ends_at, p.verified, p.onboarded, p.trial_ends_at, p.created_at, u.last_sign_in_at,
           greatest((select s.updated_at from public.user_state s where s.user_id = p.id), (select max(a.created_at) from public.ai_usage a where a.user_id = p.id), u.last_sign_in_at),
           u.banned_until,
           (select count(*) from public.ai_usage a where a.user_id = p.id and a.kind <> 'batch' and a.created_at > now() - interval '30 days'),
           (select count(*) from public.listings l where l.owner_id = p.id),
           (select count(*) from public.gig_orders o where o.buyer_id = p.id),
           (select coalesce(sum(pm.amount), 0) from public.payments pm where pm.user_id = p.id and pm.status = 'paid' and pm.currency = 'LKR' and (pm.provider_ref like 'pay:%' or pm.provider <> 'payhere')),
           coalesce(nullif(u.raw_app_meta_data ->> 'provider', ''), 'email'),
           p.signup_source,
           p.signup_campaign
    from public.profiles p
    join auth.users u on u.id = p.id
    where p_search = '' or p.display_name ilike '%' || p_search || '%' or u.email ilike '%' || p_search || '%' or p.city ilike '%' || p_search || '%'
    order by p.created_at desc
    limit least(greatest(p_limit, 1), 2000);
end;
$$;
revoke execute on function public.admin_members(text, integer) from public, anon;
grant execute on function public.admin_members(text, integer) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Analytics: count assistant chats, sign-in methods and sign-up sources.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_analytics(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  d integer := least(greatest(coalesce(p_days, 30), 1), 3650);
  today date := (now() at time zone 'Asia/Colombo')::date;
  since_day date := today - (d - 1);
  since timestamptz := (since_day::timestamp at time zone 'Asia/Colombo');
  main_price numeric := coalesce((select (value #>> '{}')::numeric from public.app_settings where key = 'main_price_lkr'), 1990);
  ultra_price numeric := coalesce((select (value #>> '{}')::numeric from public.app_settings where key = 'ultra_price_lkr'), 5990);
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  with
  plans as (
    select p.id, public.plan_of(p.id) as plan from public.profiles p
  ),
  -- Anything a member does counts as activity for that day.
  act as (
    select user_id as uid, created_at as at from public.ai_usage
    union all select owner_id, created_at from public.listings
    union all select sender_id, created_at from public.messages
    union all select sender_id, created_at from public.group_messages
    union all select buyer_id, created_at from public.gig_orders
    union all select user_id, created_at from public.document_reviews
    union all select user_id, updated_at from public.user_state
    union all select id, created_at from public.profiles
  ),
  days as (
    select g::date as day from generate_series(since_day, today, interval '1 day') g
  ),
  daily as (
    select
      days.day,
      (select count(*) from public.profiles p where (p.created_at at time zone 'Asia/Colombo')::date = days.day) as signups,
      (select count(distinct a.uid) from act a where (a.at at time zone 'Asia/Colombo')::date = days.day) as active,
      (select count(*) from public.ai_usage u where u.kind = 'document' and u.status = 'done' and (u.created_at at time zone 'Asia/Colombo')::date = days.day) as ai_document,
      (select count(*) from public.ai_usage u where u.kind = 'cv' and u.status = 'done' and (u.created_at at time zone 'Asia/Colombo')::date = days.day) as ai_cv,
      (select count(*) from public.ai_usage u where u.kind = 'sop' and u.status = 'done' and (u.created_at at time zone 'Asia/Colombo')::date = days.day) as ai_sop,
      (select count(*) from public.ai_usage u where u.kind = 'journey' and u.status = 'done' and (u.created_at at time zone 'Asia/Colombo')::date = days.day) as ai_journey,
      (select count(*) from public.ai_usage u where u.kind = 'chat' and u.status = 'done' and (u.created_at at time zone 'Asia/Colombo')::date = days.day) as ai_chat,
      (select count(*) from public.ai_usage u where u.kind = 'batch' and (u.created_at at time zone 'Asia/Colombo')::date = days.day) as ai_batch,
      (select count(*) from public.ai_usage u where u.model like 'claude-sonnet%' and (u.created_at at time zone 'Asia/Colombo')::date = days.day) as ai_fallback,
      (select coalesce(sum(pm.amount), 0) from public.payments pm where pm.status = 'paid' and pm.currency = 'LKR' and pm.provider_ref like 'pay:%' and (pm.created_at at time zone 'Asia/Colombo')::date = days.day)
        + (select coalesce(sum(pm.amount), 0) from public.payments pm where pm.status = 'paid' and pm.currency = 'LKR' and pm.provider <> 'payhere' and (pm.created_at at time zone 'Asia/Colombo')::date = days.day) as revenue,
      (select count(*) from public.gig_orders o where (o.created_at at time zone 'Asia/Colombo')::date = days.day) as bookings,
      (select count(*) from public.listings l where (l.created_at at time zone 'Asia/Colombo')::date = days.day) as listings,
      (select count(*) from public.messages m where (m.created_at at time zone 'Asia/Colombo')::date = days.day)
        + (select count(*) from public.group_messages m where (m.created_at at time zone 'Asia/Colombo')::date = days.day) as messages
    from days
  ),
  counts as (
    select
      (select count(*) from public.profiles) as members,
      (select count(*) from public.profiles where created_at >= since) as new_members,
      (select count(*) from public.profiles where onboarded) as onboarded,
      (select count(distinct uid) from act where at > now() - interval '7 days') as active_7d,
      (select count(distinct uid) from act where at > now() - interval '30 days') as active_30d,
      (select count(*) from plans where plan = 'pro') as main,
      (select count(*) from plans where plan = 'ultra') as ultra,
      (select count(*) from plans where plan = 'trial') as trial,
      (select count(*) from plans where plan = 'free') as free,
      (select count(distinct user_id) from public.ai_usage where status = 'done' and kind <> 'batch') as used_ai_ever
  )
  select jsonb_build_object(
    'days', d,
    'since', since_day,
    'kpis', (
      select jsonb_build_object(
        'members', c.members,
        'new_members', c.new_members,
        'onboarded', c.onboarded,
        'active_7d', c.active_7d,
        'active_30d', c.active_30d,
        'main', c.main,
        'ultra', c.ultra,
        'trial', c.trial,
        'free', c.free,
        'paying', c.main + c.ultra,
        'mrr_lkr', c.main * main_price + c.ultra * ultra_price,
        'main_price', main_price,
        'ultra_price', ultra_price,
        'revenue_lkr', (select coalesce(sum(revenue), 0) from daily),
        'revenue_all_lkr', (select coalesce(sum(amount), 0) from public.payments where status = 'paid' and currency = 'LKR' and (provider_ref like 'pay:%' or provider <> 'payhere')),
        'ai_requests', (select coalesce(sum(ai_document + ai_cv + ai_sop + ai_journey + ai_chat), 0) from daily),
        'ai_batch', (select coalesce(sum(ai_batch), 0) from daily),
        'ai_fallback', (select coalesce(sum(ai_fallback), 0) from daily),
        'ai_users', (select count(distinct user_id) from public.ai_usage where created_at >= since and kind <> 'batch' and status = 'done'),
        'bookings', (select coalesce(sum(bookings), 0) from daily),
        'bookings_value_lkr', (select coalesce(sum(amount_lkr), 0) from public.gig_orders where status in ('paid', 'completed') and created_at >= since),
        'platform_fees_lkr', (select coalesce(sum(platform_fee_lkr), 0) from public.gig_orders where status in ('paid', 'completed') and created_at >= since),
        'listings', (select coalesce(sum(listings), 0) from daily),
        'messages', (select coalesce(sum(messages), 0) from daily),
        'open_reports', (select count(*) from public.reports where not resolved),
        'pending_providers', (select count(*) from public.provider_applications where status = 'pending'),
        'pending_agencies', (select count(*) from public.agencies where status = 'pending')
      )
      from counts c
    ),
    'daily', (select coalesce(jsonb_agg(to_jsonb(x) order by x.day), '[]'::jsonb) from daily x),
    'breakdown', jsonb_build_object(
      'stage', (select coalesce(jsonb_object_agg(stage, n), '{}'::jsonb) from (select stage, count(*) n from public.profiles group by stage) s),
      'situation', (select coalesce(jsonb_object_agg(situation, n), '{}'::jsonb) from (select situation, count(*) n from public.profiles group by situation) s),
      'path', (select coalesce(jsonb_object_agg(path, n), '{}'::jsonb) from (select path, count(*) n from public.profiles group by path) s),
      'plan', (select coalesce(jsonb_object_agg(plan, n), '{}'::jsonb) from (select plan, count(*) n from plans group by plan) s),
      'city', (select coalesce(jsonb_object_agg(city, n), '{}'::jsonb) from (select coalesce(nullif(city, ''), 'Not set') city, count(*) n from public.profiles group by 1 order by 2 desc limit 8) s),
      'ai_kind', (select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb) from (select kind, count(*) n from public.ai_usage where created_at >= since and status = 'done' group by kind) s),
      'provider', (select coalesce(jsonb_object_agg(provider, n), '{}'::jsonb) from (select coalesce(nullif(u.raw_app_meta_data ->> 'provider', ''), 'email') provider, count(*) n from public.profiles p join auth.users u on u.id = p.id where p.created_at >= since group by 1) s),
      'source', (select coalesce(jsonb_object_agg(source, n), '{}'::jsonb) from (select coalesce(nullif(p.signup_source, ''), 'Direct / unknown') source, count(*) n from public.profiles p where p.created_at >= since group by 1 order by 2 desc limit 10) s),
      'campaign', (select coalesce(jsonb_object_agg(campaign, n), '{}'::jsonb) from (select p.signup_campaign campaign, count(*) n from public.profiles p where p.created_at >= since and coalesce(p.signup_campaign, '') <> '' group by 1 order by 2 desc limit 10) s),
      'ai_model', (select coalesce(jsonb_object_agg(coalesce(model, 'unknown'), n), '{}'::jsonb) from (select model, count(*) n from public.ai_usage where created_at >= since and status = 'done' group by model) s)
    ),
    'top_ai_users', (
      select coalesce(jsonb_agg(jsonb_build_object('id', t.user_id, 'name', p.display_name, 'email', u.email, 'plan', public.plan_of(t.user_id), 'uses', t.n) order by t.n desc), '[]'::jsonb)
      from (select user_id, count(*) n from public.ai_usage where created_at >= since and kind <> 'batch' and status = 'done' group by user_id order by 2 desc limit 10) t
      join public.profiles p on p.id = t.user_id
      left join auth.users u on u.id = t.user_id
    ),
    'funnel', (
      select jsonb_build_array(
        jsonb_build_object('step', 'Registered', 'n', c.members),
        jsonb_build_object('step', 'Finished onboarding', 'n', c.onboarded),
        jsonb_build_object('step', 'Active in 30 days', 'n', c.active_30d),
        jsonb_build_object('step', 'Used AI', 'n', c.used_ai_ever),
        jsonb_build_object('step', 'Paying', 'n', c.main + c.ultra)
      )
      from counts c
    )
  )
  into result;
  return result;
end;
$$;
