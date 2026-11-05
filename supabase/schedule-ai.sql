-- Run once in the Supabase SQL editor (not a migration: it needs your service role key).
-- 1. Store the service role key in Vault (Project Settings → API → service_role):
--      select vault.create_secret('<service-role-key>', 'service_role_key');
-- 2. Replace <project-ref> below, then run the rest.
--
-- Nightly at 2:10am Sri Lanka time (20:40 UTC) the job queues an AI journey
-- review for every active Main and Ultra member through the Message Batches
-- API (half price). Every hour at :25 it collects finished reviews; anything
-- Claude Haiku couldn't do is re-queued once on Claude Sonnet.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'journey-batch-submit',
  '40 20 * * *',
  $$ select net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/journey-batch',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
       ),
       body := '{"action":"submit"}'::jsonb
     ); $$
);

select cron.schedule(
  'journey-batch-collect',
  '25 * * * *',
  $$ select net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/journey-batch',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
       ),
       body := '{"action":"collect"}'::jsonb
     ); $$
);
