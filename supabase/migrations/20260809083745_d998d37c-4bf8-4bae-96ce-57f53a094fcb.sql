SELECT cron.unschedule('send-retention-email-daily');
SELECT cron.unschedule('retention-email-daily');
SELECT cron.schedule(
  'send-retention-email-monthly',
  '0 7 3 * *',
  $$
  SELECT net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url') || '/functions/v1/send-retention-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_anon_key')
    ),
    body := '{}'
  );
  $$
);