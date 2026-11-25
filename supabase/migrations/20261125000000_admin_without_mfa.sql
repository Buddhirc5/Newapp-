-- The owner chose to drop the authenticator (MFA) step for the admin console.
-- Admin rights now need only a signed-in account listed in public.admins.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
