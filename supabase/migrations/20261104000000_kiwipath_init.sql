-- KiwiPath initial schema.
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.
-- Every table has row level security: people can only read and write their own rows,
-- and community content is only visible after a moderator approves it.

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- No policies: only the service role (dashboard / server code) can manage admins.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Per-user app state (profile, progress, plans). One JSON document per user,
-- written by the app's sync engine. Newest copy wins on sign-in.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  constraint user_state_size check (pg_column_size(state) < 512000)
);

alter table public.user_state enable row level security;

create policy "Users read their own state"
  on public.user_state for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users create their own state"
  on public.user_state for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own state"
  on public.user_state for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own state"
  on public.user_state for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Pathway content, so visa summaries can be corrected without a new app release.
-- Seeded from src/data/pathways.ts by `npm run gen:seed`.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.pathways (
  id text primary key,
  content jsonb not null,
  checked_on date,
  reviewed_by text,
  updated_at timestamptz not null default now()
);

alter table public.pathways enable row level security;

create policy "Anyone can read pathways"
  on public.pathways for select to anon, authenticated
  using (true);

create policy "Admins manage pathways"
  on public.pathways for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create trigger pathways_touch before update on public.pathways
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Accredited employers, imported from Immigration NZ's published list.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.accredited_employers (
  id bigint generated always as identity primary key,
  name text not null,
  nzbn text,
  accreditation_type text,
  source_date date not null,
  imported_at timestamptz not null default now(),
  constraint accredited_employers_nzbn check (nzbn is null or nzbn ~ '^94[0-9]{11}$')
);

create index if not exists accredited_employers_name_idx
  on public.accredited_employers using gin (to_tsvector('simple', name));

alter table public.accredited_employers enable row level security;

create policy "Anyone can search accredited employers"
  on public.accredited_employers for select to anon, authenticated
  using (true);

create policy "Admins manage accredited employers"
  on public.accredited_employers for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Community scam reports. Visible to everyone only once approved.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.scam_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  channel text not null check (char_length(channel) <= 60),
  summary text not null check (char_length(summary) between 10 and 600),
  amount_lkr bigint check (amount_lkr is null or amount_lkr between 0 and 1000000000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists scam_reports_status_idx on public.scam_reports (status, created_at desc);

alter table public.scam_reports enable row level security;

create policy "Approved reports are public"
  on public.scam_reports for select to anon, authenticated
  using (status = 'approved');

create policy "Reporters see their own reports"
  on public.scam_reports for select to authenticated
  using ((select auth.uid()) = reporter_id);

create policy "Signed-in users can report"
  on public.scam_reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id and status = 'pending');

create policy "Admins moderate reports"
  on public.scam_reports for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Mentors and bookings (the marketplace).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.mentors (
  id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null,
  role text not null,
  city text not null,
  years_in_nz smallint not null check (years_in_nz between 0 and 80),
  path text not null check (path in ('student', 'worker', 'registered', 'family', 'business')),
  languages text[] not null default '{}',
  topics text[] not null default '{}',
  bio text not null default '',
  price_lkr integer not null check (price_lkr between 0 and 1000000),
  verified boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.mentors enable row level security;

create policy "Verified mentors are public"
  on public.mentors for select to anon, authenticated
  using (verified and active);

create policy "Mentors see their own profile"
  on public.mentors for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Admins manage mentors"
  on public.mentors for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create table if not exists public.mentor_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mentor_id text not null,
  slot timestamptz not null,
  topic text not null default '' check (char_length(topic) <= 400),
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'declined', 'cancelled', 'completed')),
  created_at timestamptz not null default now()
);

create index if not exists mentor_bookings_user_idx on public.mentor_bookings (user_id, created_at desc);
create index if not exists mentor_bookings_mentor_idx on public.mentor_bookings (mentor_id, slot);

alter table public.mentor_bookings enable row level security;

create policy "Users see their own bookings"
  on public.mentor_bookings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Mentors see bookings with them"
  on public.mentor_bookings for select to authenticated
  using (exists (select 1 from public.mentors m where m.id = mentor_id and m.user_id = (select auth.uid())));

create policy "Users request bookings"
  on public.mentor_bookings for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'requested' and slot > now());

create policy "Users cancel their own bookings"
  on public.mentor_bookings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and status = 'cancelled');

create policy "Mentors respond to their bookings"
  on public.mentor_bookings for update to authenticated
  using (exists (select 1 from public.mentors m where m.id = mentor_id and m.user_id = (select auth.uid())))
  with check (status in ('confirmed', 'declined', 'completed'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Waitlists for Pro and for mentors. Write-only for the public.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('pro', 'mentor')),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  created_at timestamptz not null default now(),
  unique (kind, email)
);

alter table public.waitlist enable row level security;

create policy "Anyone can join a waitlist"
  on public.waitlist for insert to anon, authenticated
  with check (true);

create policy "Admins read waitlists"
  on public.waitlist for select to authenticated
  using ((select public.is_admin()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Private document vault (Pro). Files live under <user id>/… in a private bucket.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/heic'])
on conflict (id) do nothing;

create policy "Users read their own documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users upload their own documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users update their own documents"
  on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete their own documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
