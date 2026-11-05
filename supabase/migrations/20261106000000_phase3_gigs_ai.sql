-- Phase 3: paid sessions ("gigs") from verified providers and community mentors,
-- provider verification, and AI document checks with per-member limits.

-- ─────────────────────────────────────────────────────────────────────────────
-- Provider applications: lawyers, licensed advisers, consultants, agents.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.provider_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('lawyer', 'adviser', 'consultant', 'agent')),
  full_name text not null check (char_length(full_name) between 3 and 90),
  licence_number text not null default '' check (char_length(licence_number) <= 60),
  licence_body text not null default '' check (char_length(licence_body) <= 120),
  website text check (website is null or website ~ '^https?://'),
  bio text not null default '' check (char_length(bio) <= 800),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.provider_applications enable row level security;

create policy "Applicants see their applications"
  on public.provider_applications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Members apply to become providers"
  on public.provider_applications for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and review_note = '');

create policy "Admins review applications"
  on public.provider_applications for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Approving an application makes the member a verified provider.
create or replace function public.apply_provider_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status <> 'approved' then
    update public.profiles set role = 'provider', verified = true where id = new.user_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.apply_provider_approval() from public, anon, authenticated;

create trigger provider_applications_approve after update on public.provider_applications
  for each row execute function public.apply_provider_approval();

-- ─────────────────────────────────────────────────────────────────────────────
-- Gigs. Advice on visas or law needs a verified provider; anyone can share
-- experience as a mentor or help newcomers settle in.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.gigs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category text not null check (category in ('visa', 'legal', 'education', 'career', 'settling', 'mentoring')),
  title text not null check (char_length(title) between 5 and 90),
  description text not null check (char_length(description) between 20 and 1500),
  price_lkr integer not null check (price_lkr between 0 and 500000),
  duration_min integer not null default 30 check (duration_min in (15, 30, 45, 60, 90)),
  mode text not null default 'video' check (mode in ('video', 'chat', 'in_person')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists gigs_feed_idx on public.gigs (active, category, created_at desc);

alter table public.gigs enable row level security;

create or replace function public.can_offer(p_category text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_category in ('visa', 'legal') then exists (
      select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'provider' and p.verified
    )
    else exists (select 1 from public.profiles p where p.id = (select auth.uid()))
  end;
$$;

revoke execute on function public.can_offer(text) from public, anon;
grant execute on function public.can_offer(text) to authenticated;

create policy "Active gigs are public"
  on public.gigs for select to anon, authenticated
  using (active);

create policy "Providers see their own gigs"
  on public.gigs for select to authenticated
  using (provider_id = (select auth.uid()));

create policy "Members offer gigs they're allowed to"
  on public.gigs for insert to authenticated
  with check (provider_id = (select auth.uid()) and (select public.can_offer(category)));

create policy "Providers edit their gigs"
  on public.gigs for update to authenticated
  using (provider_id = (select auth.uid()))
  with check (provider_id = (select auth.uid()) and (select public.can_offer(category)));

create policy "Providers delete their gigs"
  on public.gigs for delete to authenticated
  using (provider_id = (select auth.uid()));

create policy "Admins manage gigs"
  on public.gigs for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Orders. Price and fee are copied from the gig and settings by the database,
-- never trusted from the browser. Payment is confirmed by the gateway or an admin.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.gig_orders (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.gigs (id) on delete restrict,
  buyer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  provider_id uuid references public.profiles (id) on delete set null,
  slot timestamptz not null,
  note text not null default '' check (char_length(note) <= 600),
  amount_lkr integer not null default 0,
  platform_fee_lkr integer not null default 0,
  meeting_link text,
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'declined', 'paid', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gig_orders_buyer_idx on public.gig_orders (buyer_id, created_at desc);
create index if not exists gig_orders_provider_idx on public.gig_orders (provider_id, created_at desc);

alter table public.gig_orders enable row level security;

create or replace function public.prepare_gig_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  g record;
  fee_pct numeric := coalesce((select (value #>> '{}')::numeric from public.app_settings where key = 'platform_fee_percent'), 20);
begin
  select * into g from public.gigs where id = new.gig_id and active;
  if g is null then
    raise exception 'This session is no longer offered';
  end if;
  if g.provider_id = new.buyer_id then
    raise exception 'You can''t book your own session';
  end if;
  new.provider_id = g.provider_id;
  new.amount_lkr = g.price_lkr;
  new.platform_fee_lkr = round(g.price_lkr * fee_pct / 100);
  new.status = 'requested';
  new.meeting_link = case when g.mode = 'video' then 'https://meet.jit.si/KiwiPath-' || replace(gen_random_uuid()::text, '-', '') else null end;
  return new;
end;
$$;

revoke execute on function public.prepare_gig_order() from public, anon, authenticated;

create trigger gig_orders_prepare before insert on public.gig_orders
  for each row execute function public.prepare_gig_order();

-- Members may only move an order along the steps that belong to them.
create or replace function public.guard_gig_order()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  new.updated_at = now();
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;
  if new.gig_id <> old.gig_id or new.buyer_id <> old.buyer_id or new.provider_id is distinct from old.provider_id
     or new.amount_lkr <> old.amount_lkr or new.platform_fee_lkr <> old.platform_fee_lkr or new.slot <> old.slot
     or new.meeting_link is distinct from old.meeting_link then
    raise exception 'Only the status of a booking can change';
  end if;
  if me = old.provider_id and (
       (old.status = 'requested' and new.status in ('accepted', 'declined'))
       or (old.status = 'paid' and new.status = 'completed')
       or (old.status = 'accepted' and new.status = 'completed' and old.amount_lkr = 0)) then
    return new;
  end if;
  if me = old.buyer_id and old.status in ('requested', 'accepted') and new.status = 'cancelled' then
    return new;
  end if;
  raise exception 'That change isn''t allowed';
end;
$$;

create trigger gig_orders_guard before update on public.gig_orders
  for each row execute function public.guard_gig_order();

create policy "Buyers and providers see their bookings"
  on public.gig_orders for select to authenticated
  using ((select auth.uid()) in (buyer_id, provider_id) or (select public.is_admin()));

create policy "Members book sessions"
  on public.gig_orders for insert to authenticated
  with check (buyer_id = (select auth.uid()) and slot > now());

create policy "Buyers and providers update their bookings"
  on public.gig_orders for update to authenticated
  using ((select auth.uid()) in (buyer_id, provider_id) or (select public.is_admin()))
  with check ((select auth.uid()) in (buyer_id, provider_id) or (select public.is_admin()));

-- ─────────────────────────────────────────────────────────────────────────────
-- AI document checks: usage counter (for daily limits) and saved results.
-- Rows are written only by the analyze-document Edge Function.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'document',
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_idx on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

create policy "Members see their usage"
  on public.ai_usage for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create table if not exists public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  doc_type text not null,
  file_name text not null default '',
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.document_reviews enable row level security;

create policy "Members see their reviews"
  on public.document_reviews for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Members delete their reviews"
  on public.document_reviews for delete to authenticated
  using (user_id = (select auth.uid()));

-- Admin overview additions.
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
