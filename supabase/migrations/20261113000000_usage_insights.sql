-- Feature usage and onboarding tracking, the AI question log (with member
-- feedback), and the admin reports that read them.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Usage events: screen views and key actions. No personal content is stored.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  event text not null check (char_length(event) between 1 and 60),
  detail text not null default '' check (char_length(detail) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists usage_events_created_idx on public.usage_events (created_at desc);
create index if not exists usage_events_event_idx on public.usage_events (event, created_at desc);
alter table public.usage_events enable row level security;
drop policy if exists "Admins read usage" on public.usage_events;
create policy "Admins read usage" on public.usage_events for select to authenticated using (public.is_admin());

-- Members record their own events only through this, with a flood limit.
create or replace function public.track_events(p_events jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  e jsonb;
  n integer := 0;
begin
  if me is null or jsonb_typeof(p_events) <> 'array' then
    return;
  end if;
  if (select count(*) from public.usage_events where user_id = me and created_at > now() - interval '1 hour') > 600 then
    return;
  end if;
  for e in select * from jsonb_array_elements(p_events) loop
    n := n + 1;
    exit when n > 40;
    if coalesce(e ->> 'event', '') ~ '^[a-z0-9_:./-]{1,60}$' then
      insert into public.usage_events (user_id, event, detail)
      values (me, e ->> 'event', left(regexp_replace(coalesce(e ->> 'detail', ''), '[^a-zA-Z0-9 _:./-]', '', 'g'), 120));
    end if;
  end loop;
  -- Keep 180 days.
  delete from public.usage_events where created_at < now() - interval '180 days' and id % 50 = 0;
end;
$$;
revoke execute on function public.track_events(jsonb) from public, anon;
grant execute on function public.track_events(jsonb) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. AI question log: what members ask the assistant, so answers and tools
--    can be improved. Emails and phone numbers are removed before saving.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.ai_questions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  question text not null,
  answer text not null default '',
  model text,
  actions integer not null default 0,
  helpful boolean,
  created_at timestamptz not null default now()
);
create index if not exists ai_questions_created_idx on public.ai_questions (created_at desc);
alter table public.ai_questions enable row level security;
drop policy if exists "Admins read AI questions" on public.ai_questions;
create policy "Admins read AI questions" on public.ai_questions for select to authenticated using (public.is_admin());

-- Members rate their own answers (thumbs up / down).
create or replace function public.rate_ai_answer(p_id bigint, p_helpful boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_questions set helpful = p_helpful where id = p_id and user_id = auth.uid();
$$;
revoke execute on function public.rate_ai_answer(bigint, boolean) from public, anon;
grant execute on function public.rate_ai_answer(bigint, boolean) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Admin report: feature usage, onboarding funnel and AI question stats.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_usage(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 365));
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  return jsonb_build_object(
    'screens', (
      select coalesce(jsonb_agg(jsonb_build_object('screen', detail, 'views', views, 'members', members) order by members desc, views desc), '[]'::jsonb)
      from (
        select detail, count(*) views, count(distinct user_id) members
        from public.usage_events where event = 'view' and created_at >= since group by detail order by 3 desc, 2 desc limit 40
      ) s
    ),
    'actions', (
      select coalesce(jsonb_agg(jsonb_build_object('action', event, 'detail', detail, 'times', times, 'members', members) order by times desc), '[]'::jsonb)
      from (
        select event, detail, count(*) times, count(distinct user_id) members
        from public.usage_events where event not in ('view') and event not like 'onboard:%' and created_at >= since
        group by event, detail order by 3 desc limit 40
      ) s
    ),
    'onboarding', (
      select coalesce(jsonb_agg(jsonb_build_object('step', step, 'members', members) order by first_at), '[]'::jsonb)
      from (
        select replace(event, 'onboard:', '') step, count(distinct user_id) members, min(created_at) first_at
        from public.usage_events where event like 'onboard:%' and created_at >= since group by event
      ) s
    ),
    'daily_active', (
      select coalesce(jsonb_agg(jsonb_build_object('day', day, 'members', n) order by day), '[]'::jsonb)
      from (
        select (created_at at time zone 'Asia/Colombo')::date day, count(distinct user_id) n
        from public.usage_events where created_at >= since group by 1
      ) s
    ),
    'questions', jsonb_build_object(
      'total', (select count(*) from public.ai_questions where created_at >= since),
      'helpful', (select count(*) from public.ai_questions where created_at >= since and helpful),
      'not_helpful', (select count(*) from public.ai_questions where created_at >= since and helpful = false),
      'with_actions', (select count(*) from public.ai_questions where created_at >= since and actions > 0)
    )
  );
end;
$$;
revoke execute on function public.admin_usage(integer) from public, anon;
grant execute on function public.admin_usage(integer) to authenticated;
