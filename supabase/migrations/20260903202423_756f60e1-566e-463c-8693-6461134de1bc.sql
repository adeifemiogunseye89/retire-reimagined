-- Remove placeholder seed content
DELETE FROM public.events_announcements WHERE title LIKE '[Sample]%';

-- Real, evergreen platform announcements (no external links, no fabricated events)
INSERT INTO public.events_announcements (title, type, date, publish_at, description, link, is_active, target_countries, target_languages, target_roles)
VALUES
  ('Welcome to Reignite', 'update', now(), now(),
   'Start with the assessment, then open your report. Your readiness score and Retirement Income Gap update as you add real numbers.',
   NULL, true, NULL, NULL, NULL),
  ('Monthly check-in: update your numbers', 'update', now() + interval '3 days', now(),
   'On the 3rd of each month we email a reminder. Log savings contributions in Metrics so your gap-closure chart stays accurate.',
   NULL, true, NULL, NULL, NULL),
  ('Upload your pension statement for verified figures', 'update', now() + interval '7 days', now(),
   'Add your latest statement in Profile. We extract your balance, last contribution date and administrator, and you confirm before anything is saved.',
   NULL, true, NULL, NULL, NULL),
  ('Micro-pensions for informal earners', 'tip', now() + interval '10 days', now(),
   'If your income is informal or mixed, a micro-pension plus disciplined ajo/esusu savings can close a large part of your Retirement Income Gap. See Tips for the details.',
   NULL, true, ARRAY['NG'], NULL, NULL),
  ('Choose the inflation scenario that fits you', 'tip', now() + interval '14 days', now(),
   'Plan & Protect lets you model conservative, moderate or pessimistic inflation. Compare all three before committing to a savings target.',
   NULL, true, NULL, NULL, NULL);