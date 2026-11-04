-- Phase 2: member stages and preferences, community groups with chat and
-- meetups, education agency directory, app settings, payments and admin tools.

-- ─────────────────────────────────────────────────────────────────────────────
-- Profiles: where the member is in their journey and what they care about.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists situation text not null default 'in_lk' check (situation in ('in_lk', 'in_nz', 'elsewhere')),
  add column if not exists stage text not null default 'exploring'
    check (stage in ('exploring', 'preparing', 'applying', 'visa', 'arrived', 'settled')),
  add column if not exists path text not null default 'student' check (path in ('student', 'worker', 'registered', 'family', 'business')),
  add column if not exists interests text[] not null default '{}',
  add column if not exists onboarded boolean not null default false,
  add column if not exists last_seen_at timestamptz not null default now();

create policy "Admins manage profiles"
  on public.profiles for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ─────────────────────────────────────────────────────────────────────────────
-- App settings, editable by admins (trial length, AI limits, feature switches).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  description text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

create policy "Settings are readable"
  on public.app_settings for select to anon, authenticated
  using (true);

create policy "Admins change settings"
  on public.app_settings for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

insert into public.app_settings (key, value, description) values
  ('trial_days', '30', 'Days of full access for new members'),
  ('ai_daily_limit', '5', 'Document checks with AI per member per day'),
  ('ai_enabled', 'false', 'Turn AI document review on once an API key is configured'),
  ('pro_price_lkr', '1490', 'Planned monthly Pro price in rupees'),
  ('platform_fee_percent', '20', 'Share of paid sessions kept by KiwiPath')
on conflict (key) do nothing;

-- New members get the trial length currently set by admins.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  days integer := coalesce((select (value #>> '{}')::integer from public.app_settings where key = 'trial_days'), 30);
begin
  insert into public.profiles (id, display_name, trial_ends_at)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'New member'),
    now() + make_interval(days => days)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Community groups: private to members, no phone numbers shared.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name text not null check (char_length(name) between 3 and 60),
  description text not null default '' check (char_length(description) <= 300),
  kind text not null check (kind in ('city', 'path', 'interest')),
  tags text[] not null default '{}',
  member_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;

create policy "Groups are listed for members"
  on public.groups for select to anon, authenticated
  using (true);

create policy "Admins manage groups"
  on public.groups for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.group_members enable row level security;

create or replace function public.is_group_member(g uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.group_members m where m.group_id = g and m.user_id = (select auth.uid()));
$$;

revoke execute on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;

create policy "Members see who is in their groups"
  on public.group_members for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_group_member(group_id)));

create policy "Members join groups"
  on public.group_members for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Members leave groups"
  on public.group_members for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.count_group_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.groups g
    set member_count = (select count(*) from public.group_members m where m.group_id = g.id)
    where g.id = coalesce(new.group_id, old.group_id);
  return null;
end;
$$;

revoke execute on function public.count_group_members() from public, anon, authenticated;

create trigger group_members_count after insert or delete on public.group_members
  for each row execute function public.count_group_members();

create table if not exists public.group_messages (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.groups (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists group_messages_group_idx on public.group_messages (group_id, created_at desc);

alter table public.group_messages enable row level security;

create policy "Group members read messages"
  on public.group_messages for select to authenticated
  using ((select public.is_group_member(group_id)));

create policy "Group members post messages"
  on public.group_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and (select public.is_group_member(group_id)));

create policy "Authors and admins delete messages"
  on public.group_messages for delete to authenticated
  using (sender_id = (select auth.uid()) or (select public.is_admin()));

create table if not exists public.meetups (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  host_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 90),
  description text not null default '' check (char_length(description) <= 600),
  starts_at timestamptz not null,
  online_link text check (online_link is null or online_link ~ '^https://'),
  place text not null default '' check (char_length(place) <= 120),
  created_at timestamptz not null default now()
);

create index if not exists meetups_group_idx on public.meetups (group_id, starts_at);

alter table public.meetups enable row level security;

create policy "Group members see meetups"
  on public.meetups for select to authenticated
  using ((select public.is_group_member(group_id)));

create policy "Group members host meetups"
  on public.meetups for insert to authenticated
  with check (host_id = (select auth.uid()) and (select public.is_group_member(group_id)) and starts_at > now());

create policy "Hosts and admins cancel meetups"
  on public.meetups for delete to authenticated
  using (host_id = (select auth.uid()) or (select public.is_admin()));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.group_messages;
  end if;
end;
$$;

insert into public.groups (slug, name, description, kind, tags) values
  ('auckland', 'Auckland', 'Sri Lankans living in or moving to Tāmaki Makaurau.', 'city', '{auckland}'),
  ('wellington', 'Wellington', 'Sri Lankans in the capital, Te Whanganui-a-Tara.', 'city', '{wellington}'),
  ('christchurch', 'Christchurch', 'Sri Lankans in Ōtautahi and Canterbury.', 'city', '{christchurch}'),
  ('hamilton', 'Hamilton & Waikato', 'Sri Lankans in Kirikiriroa and the Waikato.', 'city', '{hamilton}'),
  ('dunedin', 'Dunedin & Otago', 'Sri Lankans in Ōtepoti and the south.', 'city', '{dunedin}'),
  ('masters-students', 'Masters students', 'Choosing courses, applications, student visas and part-time work.', 'path', '{student}'),
  ('skilled-workers', 'Skilled workers', 'Job hunting, accredited employers and work visas.', 'path', '{worker}'),
  ('nurses-health', 'Nurses & health workers', 'Registration, bridging programmes and health jobs.', 'path', '{registered}'),
  ('partners-families', 'Partners & families', 'Partner visas, schools, childcare and settling as a family.', 'path', '{family}'),
  ('ielts-pte-prep', 'IELTS & PTE prep', 'Study partners, tips and speaking practice.', 'interest', '{english}'),
  ('housing-flatmates', 'Housing & flatmates', 'Find flatmates and share renting tips.', 'interest', '{housing}'),
  ('money-and-loans', 'Money, savings & loans', 'Budgeting, sending money home and paying off loans.', 'interest', '{money}')
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Education agencies in Sri Lanka. Listed only after an admin checks them.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid default auth.uid() references public.profiles (id) on delete set null,
  name text not null check (char_length(name) between 2 and 90),
  city text not null check (char_length(city) between 2 and 60),
  website text check (website is null or website ~ '^https?://'),
  services text[] not null default '{}',
  nz_partners text[] not null default '{}',
  description text not null default '' check (char_length(description) <= 800),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  verified_note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.agencies enable row level security;

create policy "Approved agencies are public"
  on public.agencies for select to anon, authenticated
  using (status = 'approved');

create policy "Submitters see their submissions"
  on public.agencies for select to authenticated
  using (submitted_by = (select auth.uid()));

create policy "Members suggest agencies"
  on public.agencies for insert to authenticated
  with check (submitted_by = (select auth.uid()) and status = 'pending' and verified_note = '');

create policy "Admins manage agencies"
  on public.agencies for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Payments, written by the payment gateway webhook (service role) later.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  provider text not null,
  provider_ref text,
  kind text not null check (kind in ('subscription', 'session', 'listing', 'other')),
  amount numeric(12, 2) not null,
  currency text not null check (currency in ('LKR', 'NZD', 'USD')),
  status text not null check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  period_end timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "Members see their payments"
  on public.payments for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Admins see all payments"
  on public.payments for select to authenticated
  using ((select public.is_admin()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin views over accounts (email and sign-in times live in auth.users).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_list_members(p_search text default '', p_limit integer default 200)
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
  verified boolean,
  interests text[],
  onboarded boolean,
  trial_ends_at timestamptz,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  listings bigint,
  groups bigint
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
    select p.id, u.email::text, p.display_name, p.situation, p.stage, p.path, p.city, p.role, p.plan, p.verified,
           p.interests, p.onboarded, p.trial_ends_at, p.created_at, u.last_sign_in_at,
           (select count(*) from public.listings l where l.owner_id = p.id),
           (select count(*) from public.group_members m where m.user_id = p.id)
    from public.profiles p
    join auth.users u on u.id = p.id
    where p_search = '' or p.display_name ilike '%' || p_search || '%' or u.email ilike '%' || p_search || '%'
    order by p.created_at desc
    limit least(greatest(p_limit, 1), 1000);
end;
$$;

revoke execute on function public.admin_list_members(text, integer) from public, anon;
grant execute on function public.admin_list_members(text, integer) to authenticated;

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
    'messages_7d', (select count(*) from public.group_messages where created_at > now() - interval '7 days'),
    'revenue_30d_lkr', (select coalesce(sum(amount), 0) from public.payments where status = 'paid' and currency = 'LKR' and created_at > now() - interval '30 days'),
    'stages', (select coalesce(jsonb_object_agg(stage, n), '{}'::jsonb) from (select stage, count(*) n from public.profiles group by stage) s)
  );
end;
$$;

revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
