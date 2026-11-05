-- Yearly packages, the AI chat assistant and client error monitoring.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Yearly packages (about two months free).
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.app_settings (key, value, description) values
  ('main_yearly_price_lkr', '19900', 'Main package yearly price in rupees'),
  ('ultra_yearly_price_lkr', '59900', 'Ultra package yearly price in rupees')
on conflict (key) do nothing;

alter table public.payments add column if not exists billing text not null default 'month';
alter table public.payments drop constraint if exists payments_billing_check;
alter table public.payments add constraint payments_billing_check check (billing in ('month', 'year'));

create or replace function public.check_setting_bounds()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  n numeric;
begin
  if new.key in ('main_price_lkr', 'ultra_price_lkr', 'pro_price_lkr', 'main_yearly_price_lkr', 'ultra_yearly_price_lkr', 'ai_daily_limit', 'ai_daily_limit_trial', 'ai_daily_limit_pro', 'ai_daily_limit_ultra', 'platform_fee_percent', 'trial_days') then
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
-- 2. The AI chat assistant counts against the same daily AI limit.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check check (kind in ('document', 'cv', 'sop', 'journey', 'batch', 'chat'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Error monitoring: the app reports crashes here; only admins can read them.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.client_errors (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  message text not null,
  stack text not null default '',
  url text not null default '',
  release text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists client_errors_created_idx on public.client_errors (created_at desc);

alter table public.client_errors enable row level security;

drop policy if exists "Admins read errors" on public.client_errors;
create policy "Admins read errors" on public.client_errors for select to authenticated using (public.is_admin());
drop policy if exists "Admins clear errors" on public.client_errors;
create policy "Admins clear errors" on public.client_errors for delete to authenticated using (public.is_admin());

-- Anyone can report an error, but only through this function, with size caps
-- and a global flood limit so it can't be used to fill the database.
create or replace function public.log_client_error(p_message text, p_stack text, p_url text, p_release text, p_user_agent text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(trim(p_message), '') = '' then
    return;
  end if;
  if (select count(*) from public.client_errors where created_at > now() - interval '1 hour') >= 500 then
    return;
  end if;
  if auth.uid() is not null and (select count(*) from public.client_errors where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 30 then
    return;
  end if;
  insert into public.client_errors (user_id, message, stack, url, release, user_agent)
  values (auth.uid(), left(p_message, 500), left(coalesce(p_stack, ''), 4000), left(coalesce(p_url, ''), 300), left(coalesce(p_release, ''), 40), left(coalesce(p_user_agent, ''), 300));
  -- Keep 30 days.
  delete from public.client_errors where created_at < now() - interval '30 days';
end;
$$;

revoke execute on function public.log_client_error(text, text, text, text, text) from public;
grant execute on function public.log_client_error(text, text, text, text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. City groups for the newly added cities.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.groups (slug, name, description, kind, tags) values
  ('tauranga', 'Tauranga & Bay of Plenty', 'Sri Lankans in Tauranga Moana and the Bay.', 'city', '{tauranga}'),
  ('palmerston-north', 'Palmerston North & Manawatū', 'Sri Lankans in Te Papaioea, including Massey students.', 'city', '{palmerston-north}'),
  ('nelson', 'Nelson & Tasman', 'Sri Lankans in Whakatū and the top of the South.', 'city', '{nelson}'),
  ('napier-hastings', 'Hawke''s Bay', 'Sri Lankans in Napier, Hastings and Hawke''s Bay.', 'city', '{napier-hastings}'),
  ('new-plymouth', 'New Plymouth & Taranaki', 'Sri Lankans in Ngāmotu and Taranaki.', 'city', '{new-plymouth}'),
  ('rotorua', 'Rotorua', 'Sri Lankans in Rotorua.', 'city', '{rotorua}'),
  ('queenstown', 'Queenstown & Central Otago', 'Sri Lankans working and living in Tāhuna.', 'city', '{queenstown}'),
  ('whangarei', 'Whangārei & Northland', 'Sri Lankans in Northland.', 'city', '{whangarei}'),
  ('invercargill', 'Invercargill & Southland', 'Sri Lankans in Waihōpai and Southland.', 'city', '{invercargill}')
on conflict (slug) do nothing;
