-- Trigger functions are never called directly; helper functions are for signed-in members only.
revoke execute on function public.apply_listing_report() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_conversation() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_participant(uuid) from public, anon;
revoke execute on function public.start_conversation(uuid, uuid) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_participant(uuid) to authenticated;
grant execute on function public.start_conversation(uuid, uuid) to authenticated;
