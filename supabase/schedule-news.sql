-- Run once in the SQL editor (not part of migrations because it contains your project URL).
-- Calls the fetch-news Edge Function every 3 hours. Replace <project-ref> and <anon-key>.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule(
  'fetch-immigration-news',
  '17 */3 * * *',
  $$ select net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/fetch-news',
       headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer <anon-key>'),
       body := '{}'::jsonb
     ); $$
);
