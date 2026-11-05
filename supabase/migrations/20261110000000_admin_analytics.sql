-- Admin analytics: one call returns KPIs, daily series, breakdowns and the
-- member funnel for the dashboard, AI usage and revenue pages. Days are counted
-- in Sri Lanka time (Asia/Colombo), where most members are.
-- Also: richer member list, payments with member names, receipt numbers, and
-- admin account actions (sign out everywhere).

-- ─────────────────────────────────────────────────────────────────────────────
-- Receipt numbers (KP-000123), assigned in order to every payment.
-- ─────────────────────────────────────────────────────────────────────────────

create sequence if not exists public.payment_receipt_seq start 1001;
alter table public.payments add column if not exists receipt_no bigint default nextval('public.payment_receipt_seq');
update public.payments set receipt_no = nextval('public.payment_receipt_seq') where receipt_no is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Analytics
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
      (select count(distinct user_id) from public.ai_usage) as used_ai_ever
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
        'ai_requests', (select coalesce(sum(ai_document + ai_cv + ai_sop + ai_journey), 0) from daily),
        'ai_batch', (select coalesce(sum(ai_batch), 0) from daily),
        'ai_fallback', (select coalesce(sum(ai_fallback), 0) from daily),
        'ai_users', (select count(distinct user_id) from public.ai_usage where created_at >= since),
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

revoke execute on function public.admin_analytics(integer) from public, anon;
grant execute on function public.admin_analytics(integer) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Members with activity, AI use, payments and lock status.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_members(p_search text default '', p_limit integer default 500)
returns table (
  id uuid,
  email text,
  display_name text,
  situation text,
  stage text,
  path text,
  city text,
  role text,
  plan text,
  effective_plan text,
  plan_ends_at timestamptz,
  verified boolean,
  onboarded boolean,
  trial_ends_at timestamptz,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  last_active timestamptz,
  banned_until timestamptz,
  ai_30d bigint,
  listings bigint,
  bookings bigint,
  paid_lkr numeric
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
           (select coalesce(sum(pm.amount), 0) from public.payments pm where pm.user_id = p.id and pm.status = 'paid' and pm.currency = 'LKR' and (pm.provider_ref like 'pay:%' or pm.provider <> 'payhere'))
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
-- Payments with member names, for the revenue page and receipts.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_payments(p_days integer default 90)
returns table (
  id uuid,
  receipt_no bigint,
  user_id uuid,
  display_name text,
  email text,
  provider text,
  provider_ref text,
  kind text,
  plan text,
  amount numeric,
  currency text,
  status text,
  period_end timestamptz,
  created_at timestamptz
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
    select pm.id, pm.receipt_no, pm.user_id, p.display_name, u.email::text, pm.provider, pm.provider_ref, pm.kind, pm.plan,
           pm.amount, pm.currency, pm.status, pm.period_end, pm.created_at
    from public.payments pm
    left join public.profiles p on p.id = pm.user_id
    left join auth.users u on u.id = pm.user_id
    where pm.created_at > now() - make_interval(days => least(greatest(coalesce(p_days, 90), 1), 3650))
    order by pm.created_at desc
    limit 1000;
end;
$$;

revoke execute on function public.admin_payments(integer) from public, anon;
grant execute on function public.admin_payments(integer) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Sign a member out of every device (their refresh tokens stop working; the
-- current access token expires within the hour).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_sign_out_member(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  execute 'delete from auth.sessions where user_id = $1' using p_user;
  insert into public.admin_audit (action, target_table, target_id, changes)
  values ('sign_out', 'auth.users', p_user::text, '{}'::jsonb);
end;
$$;

revoke execute on function public.admin_sign_out_member(uuid) from public, anon;
grant execute on function public.admin_sign_out_member(uuid) to authenticated;

-- Service-only twin used by the admin-users function when locking a member.
create or replace function public.admin_sign_out_member_service(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  execute 'delete from auth.sessions where user_id = $1' using p_user;
end;
$$;

revoke execute on function public.admin_sign_out_member_service(uuid) from public, anon, authenticated;
