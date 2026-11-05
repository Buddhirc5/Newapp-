-- Admins can remove news stories. Removed stories stay in the table as hidden
-- so the next fetch recognises the URL and doesn't add them back.

alter table public.news_items add column if not exists hidden boolean not null default false;

drop policy if exists "News is public" on public.news_items;

create policy "News is public"
  on public.news_items for select to anon, authenticated
  using (not hidden);

create policy "Admins see removed news"
  on public.news_items for select to authenticated
  using ((select public.is_admin()));

create policy "Admins moderate news"
  on public.news_items for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete news"
  on public.news_items for delete to authenticated
  using ((select public.is_admin()));

-- Hide the two off-topic Electoral Commission stories picked up earlier.
update public.news_items set hidden = true where title ilike '%Electoral Commission%';
