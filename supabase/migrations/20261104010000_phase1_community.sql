-- Phase 1: community profiles, trial access, marketplace board, chat,
-- moderation and the immigration news feed.

-- ─────────────────────────────────────────────────────────────────────────────
-- Profiles. One per account, created automatically on sign-up.
-- Every new member gets 30 days of full access (the trial).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'New member' check (char_length(display_name) between 1 and 40),
  role text not null default 'planner' check (role in ('planner', 'newcomer', 'helper', 'provider')),
  country text not null default 'lk' check (country in ('lk', 'nz')),
  city text not null default '' check (char_length(city) <= 60),
  bio text not null default '' check (char_length(bio) <= 400),
  languages text[] not null default '{}',
  verified boolean not null default false,
  plan text not null default 'trial' check (plan in ('trial', 'free', 'pro')),
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Display name, city and bio are public so the board can show who posted.
create policy "Profiles are public"
  on public.profiles for select to anon, authenticated
  using (true);

create policy "Members edit their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Members can't grant themselves a badge, a plan or a longer trial.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.verified = old.verified;
    new.plan = old.plan;
    new.trial_ends_at = old.trial_ends_at;
    if new.role = 'provider' and old.role <> 'provider' then
      new.role = old.role;
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'New member'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Board listings: rooms, flats, homestays, airport pickups, items, jobs, deals.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category text not null check (category in ('room', 'flat', 'homestay', 'pickup', 'item', 'job', 'deal', 'service')),
  title text not null check (char_length(title) between 5 and 90),
  description text not null check (char_length(description) between 20 and 2000),
  price_nzd numeric(10, 2) check (price_nzd is null or price_nzd between 0 and 1000000),
  price_unit text not null default 'once' check (price_unit in ('week', 'month', 'once', 'free', 'hour')),
  city text not null check (char_length(city) between 2 and 60),
  suburb text not null default '' check (char_length(suburb) <= 60),
  available_from date,
  photos text[] not null default '{}' check (cardinality(photos) <= 4),
  status text not null default 'active' check (status in ('active', 'hidden', 'sold', 'removed')),
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '60 days')
);

create index if not exists listings_feed_idx on public.listings (status, category, created_at desc);
create index if not exists listings_owner_idx on public.listings (owner_id, created_at desc);

alter table public.listings enable row level security;

create policy "Active listings are public"
  on public.listings for select to anon, authenticated
  using (status = 'active' and expires_at > now());

create policy "Owners see their own listings"
  on public.listings for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Members post listings"
  on public.listings for insert to authenticated
  with check ((select auth.uid()) = owner_id and status = 'active' and report_count = 0);

-- Owners can edit, mark sold or remove, but cannot un-hide a listing moderators hid.
create policy "Owners update their listings"
  on public.listings for update to authenticated
  using ((select auth.uid()) = owner_id and status <> 'hidden')
  with check ((select auth.uid()) = owner_id and status in ('active', 'sold', 'removed'));

create policy "Owners delete their listings"
  on public.listings for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Admins manage listings"
  on public.listings for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create or replace function public.protect_listing_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Only direct edits by members are restricted; the report trigger (running as the owner role) may update counts.
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.report_count = old.report_count;
    new.owner_id = old.owner_id;
    new.created_at = old.created_at;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger listings_protect before update on public.listings
  for each row execute function public.protect_listing_fields();

create table if not exists public.saved_listings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.saved_listings enable row level security;

create policy "Members manage their saved listings"
  on public.saved_listings for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Reports. Three reports from different members hide a listing until reviewed.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'message', 'profile')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

alter table public.reports enable row level security;

create policy "Members file reports"
  on public.reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id and resolved = false);

create policy "Members see their own reports"
  on public.reports for select to authenticated
  using ((select auth.uid()) = reporter_id);

create policy "Admins handle reports"
  on public.reports for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create or replace function public.apply_listing_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.target_type = 'listing' then
    update public.listings
      set report_count = report_count + 1,
          status = case when report_count + 1 >= 3 and status = 'active' then 'hidden' else status end
      where id = new.target_id;
  end if;
  return new;
end;
$$;

create trigger reports_apply after insert on public.reports
  for each row execute function public.apply_listing_report();

-- ─────────────────────────────────────────────────────────────────────────────
-- Chat between members, optionally about a listing.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  member_a uuid not null references public.profiles (id) on delete cascade,
  member_b uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (member_a <> member_b)
);

create unique index if not exists conversations_pair_idx
  on public.conversations (coalesce(listing_id, '00000000-0000-0000-0000-000000000000'::uuid), least(member_a, member_b), greatest(member_a, member_b));

alter table public.conversations enable row level security;

create policy "Members see their conversations"
  on public.conversations for select to authenticated
  using ((select auth.uid()) in (member_a, member_b));

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create or replace function public.is_participant(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conv and (select auth.uid()) in (c.member_a, c.member_b)
  );
$$;

create policy "Participants read messages"
  on public.messages for select to authenticated
  using ((select public.is_participant(conversation_id)));

create policy "Participants send messages"
  on public.messages for insert to authenticated
  with check ((select auth.uid()) = sender_id and (select public.is_participant(conversation_id)));

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch after insert on public.messages
  for each row execute function public.touch_conversation();

-- Live chat: stream new messages to participants (RLS still applies).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- Opens (or reuses) a conversation with a listing's owner or another member.
create or replace function public.start_conversation(p_listing uuid default null, p_member uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  other uuid := p_member;
  conv uuid;
begin
  if me is null then
    raise exception 'Sign in to send messages';
  end if;
  if p_listing is not null then
    select owner_id into other from public.listings where id = p_listing and status = 'active';
    if other is null then
      raise exception 'This listing is no longer available';
    end if;
  end if;
  if other is null or other = me then
    raise exception 'Choose someone else to message';
  end if;

  select id into conv from public.conversations
    where coalesce(listing_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(p_listing, '00000000-0000-0000-0000-000000000000'::uuid)
      and least(member_a, member_b) = least(me, other)
      and greatest(member_a, member_b) = greatest(me, other);
  if conv is null then
    insert into public.conversations (listing_id, member_a, member_b) values (p_listing, me, other) returning id into conv;
  end if;
  return conv;
end;
$$;

revoke all on function public.start_conversation(uuid, uuid) from public;
grant execute on function public.start_conversation(uuid, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Immigration news, collected by the fetch-news Edge Function on a schedule.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.news_items (
  id bigint generated always as identity primary key,
  source text not null,
  title text not null,
  url text not null unique,
  summary text not null default '',
  tags text[] not null default '{}',
  published_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists news_items_published_idx on public.news_items (published_at desc);

alter table public.news_items enable row level security;

create policy "News is public"
  on public.news_items for select to anon, authenticated
  using (true);
-- Writes come only from the Edge Function using the service role.

-- ─────────────────────────────────────────────────────────────────────────────
-- Listing photos: public to view, members upload into their own folder.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Members upload listing photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Members delete their listing photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
